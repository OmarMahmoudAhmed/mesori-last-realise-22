package com.omarmahmoud.mesori.dashboard.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiException(val code: Int, message: String) : Exception(message)

/** عميل بسيط لـ Supabase Auth و PostgREST (بدون SDK) */
class SupabaseApi(
    private val baseUrl: String,
    private val anonKey: String,
) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true }

    @Serializable
    data class Session(
        @SerialName("access_token") val accessToken: String,
        @SerialName("refresh_token") val refreshToken: String,
    )

    fun signIn(email: String, password: String): Session =
        post(
            "/auth/v1/token?grant_type=password",
            buildJsonObject {
                put("email", email)
                put("password", password)
            }.toString(),
        )

    fun refresh(refreshToken: String): Session =
        post(
            "/auth/v1/token?grant_type=refresh_token",
            buildJsonObject { put("refresh_token", refreshToken) }.toString(),
        )

    fun fetchProfiles(token: String): List<ProfileRow> =
        get("/rest/v1/profiles?select=id,username,age,total_points,created_at", token)

    fun fetchProgress(token: String): List<ProgressRow> =
        get("/rest/v1/user_progress?select=user_id,level_id,stage_id,is_completed,best_score,updated_at", token)

    fun fetchStages(token: String): List<StageRow> =
        get("/rest/v1/stages?select=level_id,id,title,order_index", token)

    private fun post(path: String, body: String): Session {
        val request = Request.Builder()
            .url(baseUrl + path)
            .header("apikey", anonKey)
            .post(body.toRequestBody(JSON_TYPE))
            .build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw ApiException(response.code, text.take(300))
            return json.decodeFromString(text)
        }
    }

    private inline fun <reified T> get(path: String, token: String): T {
        val request = Request.Builder()
            .url(baseUrl + path)
            .header("apikey", anonKey)
            .header("Authorization", "Bearer $token")
            .build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw ApiException(response.code, text.take(300))
            return json.decodeFromString(text)
        }
    }

    private companion object {
        val JSON_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}
