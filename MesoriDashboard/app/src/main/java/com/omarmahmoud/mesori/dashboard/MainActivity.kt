package com.omarmahmoud.mesori.dashboard

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import com.omarmahmoud.mesori.dashboard.data.DashboardRepository
import com.omarmahmoud.mesori.dashboard.data.SessionStore
import com.omarmahmoud.mesori.dashboard.data.SupabaseApi
import com.omarmahmoud.mesori.dashboard.ui.DashboardApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repo = DashboardRepository(
            api = SupabaseApi(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY),
            store = SessionStore(applicationContext),
            // أسماء حسابات التست اللي عايز تستبعدها من الإحصائيات
            excludeUsernames = setOf("Mesori Tester"),
        )

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                DashboardApp(repo)
            }
        }
    }
}
