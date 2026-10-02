package com.devtrack.companion;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int PICK_BACKUP = 21;
    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(17, 24, 39));
        webView.setTag("devtrack-webview");
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only documents selected through the system picker.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost()) && url.getPath() != null && url.getPath().startsWith("/assets/")) return false;
                if (request.isForMainFrame() && "https".equals(url.getScheme()) && "github.com".equals(url.getHost())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (Exception error) { Toast.makeText(MainActivity.this, "No browser available", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try { startActivityForResult(intent, PICK_BACKUP); }
                catch (Exception error) { pendingFiles.onReceiveValue(null); pendingFiles = null; }
                return true;
            }
        });
        webView.addJavascriptInterface(new BackupBridge(), "DevTrackAndroid");
        webView.loadUrl(ORIGIN + "/assets/companion.html");
    }

    private class BackupBridge {
        @JavascriptInterface public void shareRecovery(String original) {
            shareFile(original, "DevTrack-recovery.json");
        }
        @JavascriptInterface public void shareBackup(String json) {
            try {
                if (json.length() > 16 * 1024 * 1024) throw new IllegalArgumentException("Backup too large");
                JSONObject backup = new JSONObject(json);
                if (!"devtrack-companion".equals(backup.optString("format")) || backup.optInt("version") != 1) throw new IllegalArgumentException("Invalid backup");
                shareFile(json, "DevTrack-companion.json");
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not export backup", Toast.LENGTH_LONG).show());
            }
        }
        private void shareFile(String json, String name) {
            try {
                if (json.length() > 16 * 1024 * 1024) throw new IllegalArgumentException("Backup too large");
                File directory = new File(getCacheDir(), "shared");
                if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Cannot create backup directory");
                File file = new File(directory, name);
                Files.write(file.toPath(), json.getBytes(StandardCharsets.UTF_8));
                Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", file);
                Intent share = new Intent(Intent.ACTION_SEND).setType("application/json")
                    .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(share, "Export DevTrack backup")));
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not export backup", Toast.LENGTH_LONG).show());
            }
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_BACKUP && pendingFiles != null) {
            pendingFiles.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[] { data.getData() } : null);
            pendingFiles = null;
        }
    }
    @Override public void onBackPressed() {
        webView.evaluateJavascript("(() => { if (window.DevTrackCanGoBack && window.DevTrackCanGoBack()) { window.dispatchEvent(new Event('devtrack-back')); return true; } return false; })()", handled -> {
            if (!"true".equals(handled)) finish();
        });
    }
    @Override protected void onDestroy() {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        webView.removeJavascriptInterface("DevTrackAndroid");
        webView.destroy();
        super.onDestroy();
    }
}
