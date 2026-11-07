package com.omarmahmoud.mesori.dashboard.data

import java.time.Duration
import java.time.OffsetDateTime

data class StageKey(val levelId: Int, val stageId: Int)

/** صف في القمع: كام شخص أكمل المرحلة دي، وكام وقف بعدها */
data class FunnelRow(
    val order: Int,
    val levelId: Int,
    val title: String,
    val completed: Int,
    val percentOfAccounts: Float,   // من إجمالي الحسابات
    val percentOfPrevious: Float?,  // من المرحلة اللي قبلها
    val droppedAfter: Int?,         // أكمل المرحلة دي ومكملش اللي بعدها
)

data class UserRow(
    val username: String,
    val age: Int?,
    val completedStages: Int,
    val points: Int,
    val lastCompleted: String,
    val nextStage: String,           // المرحلة اللي وقف قبلها
    val activeSpanDays: Long,        // من أول لآخر نشاط (تقريبي، مش وقت اللعب الفعلي)
    val daysSinceLast: Long?,
)

data class Stats(
    val totalAccounts: Int,
    val accountsWithProgress: Int,
    val avgCompletedStages: Float,
    val totalStages: Int,
)

data class Report(
    val stats: Stats,
    val funnel: List<FunnelRow>,
    val users: List<UserRow>,
    val stuck: List<UserRow>,
)

/**
 * الحسابات كلها بتتم على الجهاز. user_progress فيه صفوف للمراحل المكتملة فقط،
 * فالتحليل بيقيس "وصل لحد فين ووقف فين" وماينفعش يقيس الوقت داخل المرحلة أو الإجابات الغلط.
 */
class Analytics(
    private val data: Snapshot,
    private val now: OffsetDateTime,
    private val stuckAfterDays: Long = 7,
) {
    private val stages: List<StageRow> = data.stages.sortedWith(
        compareBy<StageRow>({ it.levelId }, { it.orderIndex }, { it.id })
    )

    private val indexOf: Map<StageKey, Int> =
        stages.mapIndexed { i, s -> StageKey(s.levelId, s.id) to i }.toMap()

    private val completedBy: Map<String, Set<StageKey>> = data.progress
        .filter { it.isCompleted }
        .groupBy({ it.userId }, { StageKey(it.levelId, it.stageId) })
        .mapValues { it.value.toSet() }

    private val rowsBy: Map<String, List<ProgressRow>> = data.progress.groupBy { it.userId }

    fun report(): Report {
        val users = buildUsers()
        return Report(
            stats = buildStats(),
            funnel = buildFunnel(),
            users = users.sortedWith(
                compareByDescending<UserRow> { it.completedStages }
                    .thenByDescending { it.points }
                    .thenByDescending { it.activeSpanDays }
            ),
            stuck = users
                .filter { it.completedStages < stages.size && (it.daysSinceLast ?: 0L) >= stuckAfterDays }
                .sortedByDescending { it.daysSinceLast ?: 0L },
        )
    }

    private fun label(index: Int): String {
        val s = stages[index]
        return "المستوى ${s.levelId} · ${s.title}"
    }

    private fun buildStats(): Stats {
        val withProgress = rowsBy.size
        val totalDone = completedBy.values.sumOf { it.size }
        return Stats(
            totalAccounts = data.profiles.size,
            accountsWithProgress = withProgress,
            avgCompletedStages = if (withProgress == 0) 0f else totalDone.toFloat() / withProgress,
            totalStages = stages.size,
        )
    }

    private fun buildFunnel(): List<FunnelRow> {
        val denom = data.profiles.size.coerceAtLeast(1).toFloat()
        val sets = completedBy.values
        var previous: Int? = null
        return stages.mapIndexed { i, s ->
            val key = StageKey(s.levelId, s.id)
            val completed = sets.count { key in it }
            val nextKey = stages.getOrNull(i + 1)?.let { StageKey(it.levelId, it.id) }
            val dropped = nextKey?.let { nk -> sets.count { key in it && nk !in it } }
            val row = FunnelRow(
                order = i + 1,
                levelId = s.levelId,
                title = s.title,
                completed = completed,
                percentOfAccounts = completed / denom,
                percentOfPrevious = previous?.takeIf { it > 0 }?.let { completed.toFloat() / it },
                droppedAfter = dropped,
            )
            previous = completed
            row
        }
    }

    private fun buildUsers(): List<UserRow> {
        val profiles = data.profiles.associateBy { it.id }
        return rowsBy.mapNotNull { (userId, rows) ->
            val profile = profiles[userId] ?: return@mapNotNull null
            val done = completedBy[userId].orEmpty()
            val furthest = done.maxOfOrNull { indexOf[it] ?: -1 } ?: -1
            val next = furthest + 1
            val times = rows.mapNotNull { parseTs(it.updatedAt) }
            val first = times.minOrNull()
            val last = times.maxOrNull()
            UserRow(
                username = profile.username.ifBlank { "بدون اسم" },
                age = profile.age,
                completedStages = done.size,
                points = profile.totalPoints,
                lastCompleted = if (furthest >= 0) label(furthest) else "—",
                nextStage = when {
                    furthest < 0 -> label(0)
                    next >= stages.size -> "أكمل كل المراحل"
                    else -> label(next)
                },
                activeSpanDays = if (first != null && last != null) Duration.between(first, last).toDays() else 0L,
                daysSinceLast = last?.let { Duration.between(it, now).toDays() },
            )
        }
    }

    // Postgres بيرجّع "2026-10-13 18:00:58.559664+00" — بنحوّلها لصيغة ISO
    private fun parseTs(raw: String?): OffsetDateTime? {
        if (raw.isNullOrBlank()) return null
        val iso = raw.trim().replace(' ', 'T').let { if (it.endsWith("+00")) "$it:00" else it }
        return runCatching { OffsetDateTime.parse(iso) }.getOrNull()
    }
}
