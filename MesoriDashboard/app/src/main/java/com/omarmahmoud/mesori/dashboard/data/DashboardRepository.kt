package com.omarmahmoud.mesori.dashboard.data

import java.time.OffsetDateTime
import java.time.ZoneOffset

class DashboardRepository(
    private val api: SupabaseApi,
    private val store: SessionStore,
    private val excludeUsernames: Set<String> = emptySet(),
) {
    private var accessToken: String? = null

    fun hasSession(): Boolean = store.refreshToken != null

    fun login(email: String, password: String) {
        val session = api.signIn(email.trim(), password)
        store.refreshToken = session.refreshToken
        accessToken = session.accessToken
    }

    fun logout() {
        store.refreshToken = null
        accessToken = null
    }

    fun loadReport(now: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)): Report {
        return try {
            buildReport(token(), now)
        } catch (e: ApiException) {
            if (e.code != 401) throw e
            accessToken = null               // انتهى الـ access token: جدّده ومتحاولش مرة تانية
            buildReport(token(), now)
        }
    }

    private fun token(): String {
        accessToken?.let { return it }
        val refresh = store.refreshToken ?: throw ApiException(401, "not logged in")
        val session = api.refresh(refresh)
        store.refreshToken = session.refreshToken
        accessToken = session.accessToken
        return session.accessToken
    }

    private fun buildReport(token: String, now: OffsetDateTime): Report {
        val profiles = api.fetchProfiles(token).filter { it.username !in excludeUsernames }
        val ids = profiles.map { it.id }.toSet()
        val progress = api.fetchProgress(token).filter { it.userId in ids }
        val stages = api.fetchStages(token)
        return Analytics(Snapshot(profiles, progress, stages), now).report()
    }
}
