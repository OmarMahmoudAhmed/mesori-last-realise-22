package com.omarmahmoud.mesori.dashboard.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProfileRow(
    val id: String,
    val username: String = "",
    val age: Int? = null,
    @SerialName("total_points") val totalPoints: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
)

// user_progress: صف لكل مرحلة نجح فيها المستخدم (is_completed) مع أفضل نتيجة
@Serializable
data class ProgressRow(
    @SerialName("user_id") val userId: String,
    @SerialName("level_id") val levelId: Int,
    @SerialName("stage_id") val stageId: Int,
    @SerialName("is_completed") val isCompleted: Boolean = false,
    @SerialName("best_score") val bestScore: Int = 0,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class StageRow(
    @SerialName("level_id") val levelId: Int,
    val id: Int,
    val title: String = "",
    @SerialName("order_index") val orderIndex: Int = 1,
)

data class Snapshot(
    val profiles: List<ProfileRow>,
    val progress: List<ProgressRow>,
    val stages: List<StageRow>,
)
