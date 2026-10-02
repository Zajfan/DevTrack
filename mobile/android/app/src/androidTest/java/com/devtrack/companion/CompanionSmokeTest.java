package com.devtrack.companion;

import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import android.webkit.WebView;
import org.junit.Rule;
import org.junit.Test;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

public class CompanionSmokeTest {
    @Rule public ActivityTestRule<MainActivity> activity = new ActivityTestRule<>(MainActivity.class);

    private String javascript(String source) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            WebView web = (WebView) activity.getActivity().findViewById(android.R.id.content).getRootView().findViewWithTag("devtrack-webview");
            web.evaluateJavascript(source, result -> { value.set(result); done.countDown(); });
        });
        assertTrue("WebView script callback", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    @Test public void launchesOfflineFromPackagedAssetsAndRetainsTasksAfterReload() throws Exception {
        for (int attempt = 0; attempt < 100; attempt++) {
            if (javascript("!!document.querySelector('[data-companion-ready]')").equals("true")) break;
            Thread.sleep(200);
        }
        assertEquals("true", javascript("!!document.querySelector('[data-companion-ready]')"));
        assertEquals("\"https://appassets.androidplatform.net\"", javascript("location.origin"));
        assertEquals("\"function\"", javascript("typeof DevTrackAndroid.shareBackup"));
        String seed = "localStorage.setItem('devtrack-companion-v1', JSON.stringify({format:'devtrack-companion',version:1,projects:[{id:'p',name:'Offline fixture',repository:'',tags:'Rust',notes:'Persistent note'}],tasks:[{id:'t',project_id:'p',title:'Alpha task',description:'Stored offline',status:'todo',priority:'normal',target_version:'0.1.0-alpha.1',updated_at:'2026-10-02T00:00:00Z'}]}));location.reload();true";
        javascript(seed);
        for (int attempt = 0; attempt < 100; attempt++) {
            if (javascript("document.body.innerText.includes('Offline fixture')").equals("true")) break;
            Thread.sleep(200);
        }
        assertEquals("true", javascript("document.body.innerText.includes('Offline fixture')"));
        assertEquals("true", javascript("JSON.parse(localStorage.getItem('devtrack-companion-v1')).tasks[0].target_version==='0.1.0-alpha.1'"));
        assertEquals("true", javascript("JSON.parse(localStorage.getItem('devtrack-companion-v1')).projects[0].notes==='Persistent note'"));
    }
}
