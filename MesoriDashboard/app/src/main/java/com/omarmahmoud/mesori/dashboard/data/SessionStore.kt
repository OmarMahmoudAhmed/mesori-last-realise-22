package com.omarmahmoud.mesori.dashboard.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** يحفظ الـ refresh token مشفّراً عشان الداشبورد تفتح على طول من غير ما تطلب دخول كل مرة */
class SessionStore(context: Context) {

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "mesori_dashboard_secure",
        MasterKey.Builder(context).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_REFRESH) else putString(KEY_REFRESH, value)
            }.apply()
        }

    private companion object {
        const val KEY_REFRESH = "refresh_token"
    }
}
