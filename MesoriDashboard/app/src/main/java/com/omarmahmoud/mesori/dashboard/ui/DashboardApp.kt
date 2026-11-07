package com.omarmahmoud.mesori.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.omarmahmoud.mesori.dashboard.data.ApiException
import com.omarmahmoud.mesori.dashboard.data.DashboardRepository
import com.omarmahmoud.mesori.dashboard.data.FunnelRow
import com.omarmahmoud.mesori.dashboard.data.Report
import com.omarmahmoud.mesori.dashboard.data.UserRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface UiState {
    data object LoggedOut : UiState
    data object Loading : UiState
    data class Ready(val report: Report) : UiState
    data class Error(val message: String) : UiState
}

@Composable
fun DashboardApp(repo: DashboardRepository) {
    val scope = rememberCoroutineScope()
    var state by remember {
        mutableStateOf<UiState>(if (repo.hasSession()) UiState.Loading else UiState.LoggedOut)
    }
    var loginError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun load() {
        state = UiState.Loading
        scope.launch {
            state = try {
                UiState.Ready(withContext(Dispatchers.IO) { repo.loadReport() })
            } catch (e: Exception) {
                UiState.Error(e.message ?: "حصل خطأ غير متوقع")
            }
        }
    }

    fun logout() {
        repo.logout()
        state = UiState.LoggedOut
    }

    LaunchedEffect(Unit) {
        if (state is UiState.Loading) load()
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when (val s = state) {
                UiState.LoggedOut -> LoginScreen(
                    error = loginError,
                    busy = busy,
                    onLogin = { email, password ->
                        busy = true
                        loginError = null
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) { repo.login(email, password) }
                                load()
                            } catch (e: Exception) {
                                loginError = if (e is ApiException && e.code in 400..403) {
                                    "الإيميل أو كلمة السر غلط، أو الحساب مش Admin"
                                } else {
                                    "تعذّر الاتصال: ${e.message}"
                                }
                            } finally {
                                busy = false
                            }
                        }
                    },
                )

                UiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }

                is UiState.Error -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("حصل خطأ", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text(s.message, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { load() }) { Text("إعادة المحاولة") }
                    TextButton(onClick = { logout() }) { Text("تسجيل خروج") }
                }

                is UiState.Ready -> DashboardScreen(
                    report = s.report,
                    onRefresh = { load() },
                    onLogout = { logout() },
                )
            }
        }
    }
}

@Composable
fun LoginScreen(error: String?, busy: Boolean, onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("🏺 Mesori Analytics", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Text("لوحة متابعة سلوك المستخدمين", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("الإيميل") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("كلمة السر") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { onLogin(email, password) },
            enabled = !busy && email.isNotBlank() && password.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (busy) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
            } else {
                Text("دخول")
            }
        }
    }
}

@Composable
fun DashboardScreen(report: Report, onRefresh: () -> Unit, onLogout: () -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("القمع", "المستخدمين", "المتوقفين")

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("الداشبورد", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Row {
                TextButton(onClick = onRefresh) { Text("تحديث") }
                TextButton(onClick = onLogout) { Text("خروج") }
            }
        }
        TabRow(selectedTabIndex = tab) {
            tabs.forEachIndexed { i, title ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(title) })
            }
        }
        when (tab) {
            0 -> FunnelTab(report)
            1 -> UsersTab(report.users)
            else -> StuckTab(report.stuck)
        }
    }
}

@Composable
private fun FunnelTab(report: Report) {
    val s = report.stats
    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (s.totalAccounts == 0) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "مفيش بيانات. اتأكد إن حسابك اتضاف لجدول admin_users (migration 018).",
                        modifier = Modifier.padding(12.dp),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard("الحسابات", s.totalAccounts.toString(), Modifier.weight(1f))
                StatCard("بدأوا", s.accountsWithProgress.toString(), Modifier.weight(1f))
                StatCard("متوسط المراحل", "%.1f".format(s.avgCompletedStages), Modifier.weight(1f))
            }
        }
        item {
            Text("قمع المراحل: كام شخص أكمل كل مرحلة", fontWeight = FontWeight.Bold)
        }
        items(report.funnel) { row -> FunnelRowCard(row) }
        item {
            Text(
                "ملاحظة: التحليل بيعتمد على المراحل المكتملة بس. أي حد بدأ مرحلة ومكملهاش مابيظهرش هنا.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun FunnelRowCard(row: FunnelRow) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${row.order}. ${row.title}", fontWeight = FontWeight.SemiBold)
                Text("${row.completed} شخص", fontWeight = FontWeight.Bold)
            }
            Bar(row.percentOfAccounts, MaterialTheme.colorScheme.primary)
            val prevPart = row.percentOfPrevious?.let { " · من السابقة: ${(it * 100).toInt()}%" } ?: ""
            val dropPart = row.droppedAfter?.let { " · وقف بعدها: $it" } ?: ""
            Text("المستوى ${row.levelId}$prevPart$dropPart", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun UsersTab(users: List<UserRow>) {
    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text(
                "مرتّبين: الأكتر إكمالاً ثم النقاط. «المدة» = من أول لآخر نشاط (تقريبية).",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        if (users.isEmpty()) {
            item { Text("مفيش مستخدمين بدأوا لحد دلوقتي.") }
        }
        itemsIndexed(users) { i, u -> UserCard(i + 1, u) }
    }
}

@Composable
private fun StuckTab(users: List<UserRow>) {
    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text(
                "مستخدمين بدأوا ومكملوش، ومرجعوش من أكتر من 7 أيام.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        if (users.isEmpty()) {
            item { Text("مفيش حد متوقف 🎉") }
        }
        itemsIndexed(users) { i, u -> UserCard(i + 1, u) }
    }
}

@Composable
private fun UserCard(rank: Int, u: UserRow) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "#$rank  ${u.username}${u.age?.let { " · $it سنة" } ?: ""}",
                fontWeight = FontWeight.Bold,
            )
            Text("أكمل ${u.completedStages} مرحلة · ${u.points} نقطة", style = MaterialTheme.typography.bodyMedium)
            Text("آخر مرحلة مكتملة: ${u.lastCompleted}", style = MaterialTheme.typography.bodySmall)
            Text("وقف قبل: ${u.nextStage}", style = MaterialTheme.typography.bodySmall)
            Text(
                "المدة التقريبية: ${u.activeSpanDays} يوم · آخر نشاط من ${u.daysSinceLast ?: "—"} يوم",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun Bar(fraction: Float, color: Color) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(10.dp)
            .clip(RoundedCornerShape(5.dp))
            .background(color.copy(alpha = 0.15f)),
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .height(10.dp)
                .background(color),
        )
    }
}
