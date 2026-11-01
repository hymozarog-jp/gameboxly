package ly.l1017n.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

/**
 * Gameboxly opens the live storefront using the user's actual browser session.
 * Google OAuth does not support ordinary embedded Android WebViews. Custom Tabs
 * preserve the browser's Google sign-in flow and secure cookies.
 */
public final class MainActivity extends Activity {
    private static final Uri STORE_URL = Uri.parse("https://l1017n.ct.ws/");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme);
        super.onCreate(savedInstanceState);

        try {
            CustomTabColorSchemeParams colors = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(Color.rgb(6, 17, 13))
                .setNavigationBarColor(Color.rgb(6, 17, 13))
                .build();

            CustomTabsIntent tabs = new CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setDefaultColorSchemeParams(colors)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();
            tabs.launchUrl(this, STORE_URL);
        } catch (Exception e) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, STORE_URL));
            } catch (ActivityNotFoundException notFound) {
                Toast.makeText(this, "ثبت متصفحًا لفتح متجر Gameboxly", Toast.LENGTH_LONG).show();
            }
        }
        finish();
    }
}
