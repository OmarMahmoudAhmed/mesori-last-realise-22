package com.omarmahmoud.mesori;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Edge-to-edge: الواجهة ترسم تحت شريطي الحالة والتنقل
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        // الأشرطة شفافة، فتظهر خلفيتها من الصفحة نفسها
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        // لون النافذة الذي تقرؤه SystemBars لخلفية الـ decor: رمل بدل الأسود
        getTheme().applyStyle(R.style.AppTheme_Sand, true);
    }
}
