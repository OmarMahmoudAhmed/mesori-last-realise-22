package com.omarmahmoud.mesori;

import android.os.Bundle;
import android.view.Window;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // تثبيت الـ SplashScreen لتحويل الثيم إلى NoActionBar
        SplashScreen.installSplashScreen(this);

        // إغلاق شريط العنوان والـ ActionBar بصفة نهائية
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);

        // تفعيل العرض حتى حافة الشاشة (Edge-to-Edge)
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        // لون النافذة الذي تقرؤه SystemBars لخلفية الـ decor: رمل بدل الأسود
        getTheme().applyStyle(R.style.AppTheme_Sand, true);
    }
}
