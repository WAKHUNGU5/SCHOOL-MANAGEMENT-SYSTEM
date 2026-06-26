const API_BASE = '/api';
const subjectsMap = {
    Math: "Mathematics",
    English: "English Language",
    Kiswahili: "Kiswahili Language",
    Science: "Integrated Science",
    SocialStudies: "Social Studies",
    PreTechnical: "Pre-Technical Studies",
    CRE: "CRE"
};

let appState = {
    currentTeacher: null,
    activeGrade: null,
    currentSubjectMeans: {},
    students: {}
};

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'API request failed');
    return payload;
}

function toggleAuthViews(showLogin) {
    document.getElementById('loginView').classList.toggle('hidden', !showLogin);
    document.getElementById('signupView').classList.toggle('hidden', showLogin);
}

async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
        await apiFetch('/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        alert('Teacher account registered successfully. Please sign in.');
        toggleAuthViews(true);
    } catch (error) {
        alert(error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const user = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        appState.currentTeacher = user;
        document.getElementById('navTeacherName').textContent = user.name;
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('portalDashboard').classList.remove('hidden');
    } catch (error) {
        alert(error.message);
    }
}

function handleLogout() {
    appState.currentTeacher = null;
    document.getElementById('portalDashboard').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
}

async function openGradeWorkspace(gradeId) {
    appState.activeGrade = gradeId;
    document.getElementById('gradeSelectorView').classList.add('hidden');
    document.getElementById('gradeWorkspaceView').classList.remove('hidden');
    document.getElementById('workspaceTitle').textContent = `Grade ${gradeId} Administration`;

    try {
        const students = await apiFetch(`/grades/${gradeId}/students`);
        appState.students[gradeId] = students;
    } catch (error) {
        appState.students[gradeId] = appState.students[gradeId] || [];
        alert(`Unable to load grade ${gradeId} data: ${error.message}`);
    }
    renderStudentTable();
}

function backToDashboard() {
    document.getElementById('gradeWorkspaceView').classList.add('hidden');
    document.getElementById('gradeSelectorView').classList.remove('hidden');
}

async function handleAddStudent(event) {
    event.preventDefault();
    const nameInput = document.getElementById('newStudentName');
    const studentName = nameInput.value.trim();
    if (!studentName) return;

    try {
        const newStudent = await apiFetch(`/grades/${appState.activeGrade}/students`, {
            method: 'POST',
            body: JSON.stringify({ name: studentName })
        });
        appState.students[appState.activeGrade].push(newStudent);
        nameInput.value = '';
        renderStudentTable();
    } catch (error) {
        alert(error.message);
    }
}

async function removeStudent(studentId) {
    if (!confirm('Completely remove this student record row from class list?')) return;
    try {
        await apiFetch(`/grades/${appState.activeGrade}/students/${studentId}`, {
            method: 'DELETE'
        });
        appState.students[appState.activeGrade] = appState.students[appState.activeGrade].filter(s => s.id !== studentId);
        renderStudentTable();
    } catch (error) {
        alert(error.message);
    }
}

async function updateMark(studentId, subject, value) {
    const student = appState.students[appState.activeGrade].find(s => s.id === studentId);
    if (!student) return;
    student.marks[subject] = Math.min(100, Math.max(0, parseInt(value) || 0));
    try {
        await apiFetch(`/grades/${appState.activeGrade}/students/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify({ marks: student.marks })
        });
    } catch (error) {
        alert(`Unable to save score: ${error.message}`);
    }
    calculateAnalytics();
}

function calculateAnalytics() {
    const list = appState.students[appState.activeGrade] || [];
    document.getElementById('totalStudentsDisplay').textContent = list.length;

    if (list.length === 0) {
        document.getElementById('classMeanDisplay').textContent = '00.00';
        appState.currentSubjectMeans = {};
        renderSubjectTray({});
        return;
    }

    let grandSum = 0;
    let count = 0;
    let subTotals = { Math: 0, English: 0, Kiswahili: 0, Science: 0, SocialStudies: 0, PreTechnical: 0, CRE: 0 };

    list.forEach(s => {
        for (let sub in subTotals) {
            subTotals[sub] += s.marks[sub] || 0;
            grandSum += s.marks[sub] || 0;
            count++;
        }
    });

    let means = {};
    for (let sub in subTotals) {
        means[sub] = (subTotals[sub] / list.length).toFixed(2);
    }

    appState.currentSubjectMeans = means;
    document.getElementById('classMeanDisplay').textContent = (grandSum / count).toFixed(2);
    renderSubjectTray(means);
}

function renderSubjectTray(meansObj) {
    const tray = document.getElementById('subjectMeansTray');
    tray.innerHTML = '';
    for (let key in subjectsMap) {
        const score = meansObj[key] || '00.00';
        tray.innerHTML += `
            <div class="bg-gray-50 border rounded-xl p-2.5 text-center">
                <span class="block text-[10px] text-gray-500 font-bold uppercase tracking-tight truncate">${subjectsMap[key]}</span>
                <span class="block text-sm font-black text-blue-600 mt-0.5">${score}%</span>
            </div>
        `;
    }
}

function renderStudentTable() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';
    const list = appState.students[appState.activeGrade] || [];

    list.forEach(s => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 whitespace-nowrap">
                <td class="p-3 font-bold text-gray-800 bg-white sticky left-0 shadow-sm">${s.name}</td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.Math}" onchange="updateMark(${s.id}, 'Math', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.English}" onchange="updateMark(${s.id}, 'English', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.Kiswahili}" onchange="updateMark(${s.id}, 'Kiswahili', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.Science}" onchange="updateMark(${s.id}, 'Science', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.SocialStudies}" onchange="updateMark(${s.id}, 'SocialStudies', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.PreTechnical}" onchange="updateMark(${s.id}, 'PreTechnical', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 text-center"><input type="number" min="0" max="100" value="${s.marks.CRE}" onchange="updateMark(${s.id}, 'CRE', this.value)" class="w-12 border rounded-lg p-1 text-center font-medium"></td>
                <td class="p-3 flex gap-1 justify-center items-center">
                    <button onclick="generateReportCard(${s.id})" class="bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-[11px] hover:bg-blue-600 hover:text-white transition">Report</button>
                    <button onclick="removeStudent(${s.id})" class="text-gray-300 hover:text-red-600 p-1 rounded-md transition text-xs font-bold">&times;</button>
                </td>
            </tr>
        `;
    });
    calculateAnalytics();
}

function getCBERating(score) {
    if (score >= 80) return 'Exceeding Expectation (EE)';
    if (score >= 50) return 'Meeting Expectation (ME)';
    if (score >= 30) return 'Approaching Expectation (AE)';
    return 'Below Expectation (BE)';
}

function generateReportCard(studentId) {
    const student = appState.students[appState.activeGrade].find(item => item.id === studentId);
    if (!student) return;
    document.getElementById('reportStudentName').textContent = student.name;
    document.getElementById('reportStudentGrade').textContent = `Grade ${appState.activeGrade}`;
    const rBody = document.getElementById('reportCardTableBody');
    rBody.innerHTML = '';
    let sum = 0;
    let count = 0;
    for (let key in student.marks) {
        sum += student.marks[key];
        count += 1;
        rBody.innerHTML += `
            <tr>
                <td class="p-2 border font-medium">${subjectsMap[key]}</td>
                <td class="p-2 border text-center font-bold">${student.marks[key]}</td>
                <td class="p-2 border text-center text-xs font-medium">${getCBERating(student.marks[key])}</td>
            </tr>`;
    }
    document.getElementById('reportStudentAverage').textContent = (sum / count).toFixed(1);
    document.getElementById('reportCardModal').classList.remove('hidden');
}

function openSubjectPrintPreview() {
    document.getElementById('printSubGradeTitle').textContent = `Grade ${appState.activeGrade}`;
    document.getElementById('printSubOverallMean').textContent = `${document.getElementById('classMeanDisplay').textContent}%`;
    const printBody = document.getElementById('printSubjectTableBody');
    printBody.innerHTML = '';
    for (let key in subjectsMap) {
        const meanVal = appState.currentSubjectMeans[key] || '00.00';
        printBody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-semibold text-gray-800">${subjectsMap[key]}</td>
                <td class="p-3 text-center font-black text-blue-800">${meanVal}%</td>
            </tr>`;
    }
    document.getElementById('subjectPrintModal').classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function triggerPrint() {
    window.print();
}
