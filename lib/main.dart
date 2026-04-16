import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart'
    show
        AndroidWebViewController,
        AndroidWebViewPlatform,
        GeolocationPermissionsResponse;
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:url_launcher/url_launcher_string.dart';
import 'package:open_filex/open_filex.dart';
import 'package:permission_handler/permission_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Platform.isAndroid) {
    WebViewPlatform.instance = AndroidWebViewPlatform();
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebViewPage(),
    );
  }
}

class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage>
    with SingleTickerProviderStateMixin {
  late final WebViewController controller;
  DateTime? lastBackPressed;
  bool _isSaving = false;
  bool _showSuccessAnimation = false;
  String? _successFilePath;
  late final AnimationController _successAnimationController;
  late final Animation<double> _successScaleAnimation;

  final String baseUrl = 'https://barata-berita-acara-pertanahan.netlify.app/';

  static const String _interceptBlobJs = """
    (function() {
      if (window.__flutterBlobPatched) return;
      window.__flutterBlobPatched = true;

      function sendBlobToFlutter(blobUrl, filename) {
        fetch(blobUrl)
          .then(function(res) { return res.blob(); })
          .then(function(blob) {
            var reader = new FileReader();
            reader.onloadend = function() {
              var base64 = reader.result.split(',')[1];
              if (window.BlobChannel) {
                window.BlobChannel.postMessage(JSON.stringify({
                  type: 'blob_base64',
                  data: base64,
                  filename: filename || 'berita-acara.pdf'
                }));
              }
            };
            reader.readAsDataURL(blob);
          })
          .catch(function(err) {
            console.error('Flutter blob intercept error:', err);
          });
      }

      document.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el.tagName !== 'A') {
          el = el.parentElement;
        }
        if (!el || el.tagName !== 'A') return;
        var href = el.href || '';
        if (!href.startsWith('blob:')) return;
        e.preventDefault();
        e.stopPropagation();
        var filename = el.getAttribute('download') || 'berita-acara.pdf';
        sendBlobToFlutter(href, filename);
      }, true);

      var _originalOpen = window.open;
      window.open = function(url, target, features) {
        if (url && url.startsWith('blob:')) {
          sendBlobToFlutter(url, 'berita-acara.pdf');
          return null;
        }
        return _originalOpen.apply(window, arguments);
      };

      var _origCreate = document.createElement.bind(document);
      document.createElement = function(tag) {
        var el = _origCreate(tag);
        if (tag.toLowerCase() === 'a') {
          var _origClick = el.click.bind(el);
          el.click = function() {
            var href = el.href || '';
            if (href.startsWith('blob:')) {
              var filename = el.getAttribute('download') || 'berita-acara.pdf';
              sendBlobToFlutter(href, filename);
              return;
            }
            _origClick();
          };
        }
        return el;
      };

    })();
  """;

  @override
  void initState() {
    super.initState();
    _successAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
    _successScaleAnimation = CurvedAnimation(
      parent: _successAnimationController,
      curve: Curves.elasticOut,
    );
    _requestPermissions();
    _initWebView();
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: [SystemUiOverlay.top, SystemUiOverlay.bottom],
    );
  }

  @override
  void dispose() {
    _successAnimationController.dispose();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    if (!Platform.isAndroid) return;

    // Request camera permission - agar web bisa akses kamera
    final cameraStatus = await Permission.camera.request();
    debugPrint('Camera permission: ${cameraStatus.isGranted}');

    // Request location permission - agar web bisa akses GPS
    final locationStatus = await Permission.location.request();
    debugPrint('Location permission: ${locationStatus.isGranted}');

    // Request storage permissions untuk download PDF
    final sdkVersion = _parseAndroidSdk();
    if (sdkVersion >= 33) {
      await [Permission.photos, Permission.videos, Permission.audio].request();
    } else {
      await Permission.storage.request();
    }
  }

  int _parseAndroidSdk() {
    try {
      final osVer = Platform.operatingSystemVersion;
      final match = RegExp(r'SDK\s*(\d+)').firstMatch(osVer);
      if (match != null) return int.parse(match.group(1)!);
    } catch (_) {}
    return 30;
  }

  Future<void> _initWebView() async {
    controller =
        WebViewController(
            onPermissionRequest: (request) async {
              debugPrint(
                'Media capture permission requested: ${request.types}',
              );
              await request.grant();
            },
          )
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setBackgroundColor(const Color(0x00000000))
          ..addJavaScriptChannel(
            'BlobChannel',
            onMessageReceived: (message) async {
              debugPrint('BLOB CHANNEL DITERIMA');
              try {
                final data =
                    jsonDecode(message.message) as Map<String, dynamic>;
                if (data['type'] == 'blob_base64') {
                  await _savePdfFromBase64(
                    data['data'] as String,
                    filename: data['filename'] as String? ?? 'berita-acara.pdf',
                  );
                }
              } catch (_) {
                await _savePdfFromBase64(message.message);
              }
            },
          )
          ..setNavigationDelegate(
            NavigationDelegate(
              onPageFinished: (url) async {
                debugPrint('PAGE LOADED: $url');
                await controller.runJavaScript(_interceptBlobJs);
                debugPrint('JS INJECTED');
              },
              onNavigationRequest: (request) async {
                final url = request.url;
                debugPrint('NAV REQUEST: $url');

                if (url.startsWith('blob:')) {
                  await controller.runJavaScript("""
                (function() {
                  fetch('$url')
                    .then(function(r) { return r.blob(); })
                    .then(function(blob) {
                      var reader = new FileReader();
                      reader.onloadend = function() {
                        var base64 = reader.result.split(',')[1];
                        if (window.BlobChannel) {
                          window.BlobChannel.postMessage(JSON.stringify({
                            type: 'blob_base64',
                            data: base64,
                            filename: 'berita-acara.pdf'
                          }));
                        }
                      };
                      reader.readAsDataURL(blob);
                    })
                    .catch(function(e) { console.error('fetch blob error', e); });
                })();
              """);
                  return NavigationDecision.prevent;
                }

                if (_isExternalUrl(url)) {
                  await _launchExternalUrl(url);
                  return NavigationDecision.prevent;
                }

                return NavigationDecision.navigate;
              },
              onWebResourceError: (error) {
                debugPrint('WEB ERROR: ${error.description}');
              },
            ),
          )
          ..loadRequest(Uri.parse(baseUrl));

    // Setup geolocation permission handling untuk Android
    if (Platform.isAndroid) {
      final androidController = controller.platform as AndroidWebViewController;
      await androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (params) async {
          debugPrint('Geolocation permission requested from: ${params.origin}');
          // Check dan request location permission jika belum granted
          final locationStatus = await Permission.location.request();
          final isGranted = locationStatus.isGranted;
          debugPrint(
            'Geolocation permission decision for ${params.origin}: $isGranted',
          );
          // Return response dengan allow=true (karena user sudah approve di app level)
          // retain=true agar permission persist untuk origin ini
          return GeolocationPermissionsResponse(allow: isGranted, retain: true);
        },
        onHidePrompt: () {
          debugPrint('Geolocation permission prompt hidden');
        },
      );
    }
  }

  bool _isDirectFileUrl(String url) {
    final lower = url.toLowerCase();
    const exts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];
    return exts.any((e) => lower.contains(e));
  }

  bool _isExternalUrl(String url) {
    final lower = url.toLowerCase();
    if (_isDirectFileUrl(lower)) {
      return true;
    }

    if (lower.startsWith('geo:')) {
      return true;
    }

    if (lower.contains('google.com/maps') ||
        lower.contains('maps.google.com') ||
        lower.contains('maps.app.goo.gl')) {
      return true;
    }

    return false;
  }

  Future<void> _launchExternalUrl(String url) async {
    if (url.isEmpty) return;

    final uri = Uri.tryParse(url);
    if (uri != null) {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
    }

    try {
      await launchUrlString(url, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('LAUNCH URL ERROR: $url -> $e');
    }
  }

  Future<void> _openFile(String savePath) async {
    try {
      final result = await OpenFilex.open(savePath);
      if (result.type != ResultType.done) {
        _showErrorSnackbar('Gagal membuka dokumen.');
      }
    } catch (e) {
      debugPrint('OPEN FILE ERROR: $e');
      _showErrorSnackbar('Gagal membuka dokumen.');
    }
  }

  Future<void> _savePdfFromBase64(
    String base64String, {
    String filename = 'berita-acara.pdf',
  }) async {
    if (_isSaving) return;
    if (mounted) setState(() => _isSaving = true);

    try {
      final bytes = base64Decode(base64String);
      final savePath = await _getSavePath(filename);
      final file = File(savePath);
      await file.writeAsBytes(bytes, flush: true);

      debugPrint('PDF DISIMPAN: $savePath');

      if (mounted) {
        _successFilePath = savePath;
        _showSuccessAnimation = true;
        _successAnimationController.forward(from: 0.0);
        Future.delayed(const Duration(seconds: 2), _hideSuccessAnimation);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF disimpan:\n$savePath'),
            backgroundColor: Colors.green[700],
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'Buka',
              textColor: Colors.white,
              onPressed: () async {
                await _openFile(savePath);
              },
            ),
          ),
        );
      }
    } on FormatException {
      _showErrorSnackbar('Data PDF tidak valid');
    } on FileSystemException catch (e) {
      _showErrorSnackbar('Gagal menyimpan: ${e.message}');
    } catch (e) {
      debugPrint('ERROR SAVE PDF: $e');
      _showErrorSnackbar('Gagal menyimpan PDF');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<String> _getSavePath(String filename) async {
    Directory? dir;

    if (Platform.isAndroid) {
      final downloadDir = Directory('/storage/emulated/0/Download');
      dir =
          await downloadDir.exists()
              ? downloadDir
              : await getExternalStorageDirectory();
    } else {
      dir = await getApplicationDocumentsDirectory();
    }

    dir ??= await getTemporaryDirectory();

    String path = '${dir.path}/$filename';
    if (await File(path).exists()) {
      final ts = DateTime.now().millisecondsSinceEpoch;
      final name = filename.replaceAll('.pdf', '');
      path = '${dir.path}/${name}_$ts.pdf';
    }

    return path;
  }

  void _showErrorSnackbar(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red[700]),
    );
  }

  void _hideSuccessAnimation() {
    if (!mounted) return;
    setState(() {
      _showSuccessAnimation = false;
    });
  }

  Future<void> _onPopInvokedWithResult(bool didPop, Object? result) async {
    if (didPop) return;

    final canGoBack = await controller.canGoBack();

    if (canGoBack) {
      await controller.goBack();
      lastBackPressed = null;
      return;
    }

    final now = DateTime.now();
    final isFirstPress =
        lastBackPressed == null ||
        now.difference(lastBackPressed!) > const Duration(seconds: 2);

    if (isFirstPress) {
      lastBackPressed = now;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tekan lagi untuk keluar'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else {
      SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: _onPopInvokedWithResult,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          top: true,
          bottom: true,
          child: Stack(
            fit: StackFit.expand,
            children: [
              WebViewWidget(controller: controller),

              if (_showSuccessAnimation)
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      color: Colors.black26,
                      alignment: Alignment.center,
                      child: ScaleTransition(
                        scale: _successScaleAnimation,
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 32),
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.25),
                                blurRadius: 24,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 88,
                                height: 88,
                                decoration: BoxDecoration(
                                  color: Colors.green[600],
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.green.withValues(
                                        alpha: 0.35,
                                      ),
                                      blurRadius: 16,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.check,
                                  size: 52,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 18),
                              const Text(
                                'Download Berhasil!',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (_successFilePath != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 10),
                                  child: Text(
                                    _successFilePath!,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.black87,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

              if (_isSaving)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const LinearProgressIndicator(
                        backgroundColor: Colors.black54,
                        color: Colors.blue,
                      ),
                      Container(
                        color: Colors.black87,
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        child: const Text(
                          'Menyimpan PDF...',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
