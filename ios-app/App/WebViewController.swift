import UIKit
import WebKit

/// The site in a full-screen web view, with the same `NativeIsland` bridge the Android app gives the page
/// (window.Capacitor.Plugins.NativeIsland), so the page sends its prayer times, reminders and teams to the islands.
final class WebViewController: UIViewController, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {

    static let siteURL = URL(string: "https://cplay2.vercel.app")!
    private(set) var web: WKWebView!

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    /// The page sees a native platform with the NativeIsland plugin; every call is a promise answered by Bridge.
    private static let shim = """
    (function(){if(window.Capacitor)return;var seq=0,cbs={},ls={};
    window.__dcResolve=function(id,r){var c=cbs[id];delete cbs[id];if(c)c(r)};
    window.__dcEmit=function(ev,d){(ls[ev]||[]).forEach(function(f){try{f(d)}catch(e){}})};
    function call(m,a){return new Promise(function(res){var id=++seq;cbs[id]=res;try{window.webkit.messageHandlers.dc.postMessage({id:id,method:String(m),args:a||{}})}catch(e){res({})}})}
    var plugin=new Proxy({},{get:function(t,m){if(m==='then'||typeof m!=='string')return undefined;
    if(m==='addListener')return function(ev,f){(ls[ev]=ls[ev]||[]).push(f);return Promise.resolve({remove:function(){ls[ev]=(ls[ev]||[]).filter(function(x){return x!==f})}})};
    return function(a){return call(m,a)}}});
    window.Capacitor={isNativePlatform:function(){return true},getPlatform:function(){return 'ios'},Plugins:{NativeIsland:plugin}};})();
    """

    override func loadView() {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.allowsPictureInPictureMediaPlayback = true
        cfg.userContentController.addUserScript(WKUserScript(source: Self.shim, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        cfg.userContentController.add(self, name: "dc")
        web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.uiDelegate = self
        web.navigationDelegate = self
        web.allowsBackForwardNavigationGestures = true
        if #available(iOS 16.4, *) { web.isInspectable = true }

        let root = UIView()
        root.backgroundColor = .black
        web.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: root.safeAreaLayoutGuide.topAnchor),
            web.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: root.bottomAnchor),
        ])
        view = root
        Bridge.shared.web = web
        web.load(URLRequest(url: Self.siteURL))
    }

    // MARK: bridge

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let id = body["id"] as? Int, let method = body["method"] as? String else { return }
        Bridge.shared.handle(method, args: body["args"] as? [String: Any] ?? [:]) { [weak self] result in
            let data = (try? JSONSerialization.data(withJSONObject: result)) ?? Data("{}".utf8)
            let json = String(data: data, encoding: .utf8) ?? "{}"
            DispatchQueue.main.async { self?.web.evaluateJavaScript("window.__dcResolve(\(id), \(json))", completionHandler: nil) }
        }
    }

    // MARK: links that open a new window stay here

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if action.targetFrame == nil, let u = action.request.url { webView.load(URLRequest(url: u)) }
        return nil
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "حسناً", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "إلغاء", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "موافق", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }

    /// No connection: a short message and a retry.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let html = "<html dir='rtl'><body style='background:#000;color:#fff;font-family:-apple-system;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center'><div><p style='font-size:20px'>تعذّر الاتصال بـ DriveCast</p><p style='opacity:.6'>تأكد من الإنترنت</p><a href='\(Self.siteURL.absoluteString)' style='color:#34d399;font-size:18px'>إعادة المحاولة</a></div></body></html>"
        webView.loadHTMLString(html, baseURL: nil)
    }
}
