const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'backend-data.json');

app.use(express.json());
app.use(express.static(__dirname));

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      teachers: [
        {
          id: 1,
          name: 'System Administrator Admin',
          email: 'admin@school.edu',
          password: 'adminpass'
        }
      ],
      students: {
        "1": [
          {
            id: 1,
            name: 'Austin Kiprop',
            marks: { Math: 78, English: 82, Kiswahili: 65, Science: 80, SocialStudies: 72, PreTechnical: 85, CRE: 90 }
          },
          {
            id: 2,
            name: 'Brenda Cherotich',
            marks: { Math: 64, English: 71, Kiswahili: 80, Science: 68, SocialStudies: 75, PreTechnical: 70, CRE: 82 }
          }
        ],
        "7": [
          {
            id: 3,
            name: 'Emmanuel Barasa',
            marks: { Math: 85, English: 74, Kiswahili: 90, Science: 88, SocialStudies: 68, PreTechnical: 79, CRE: 84 }
          }
        ]
      }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Unable to parse data file:', error);
    process.exit(1);
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getNextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const data = loadData();
  if (data.teachers.some(teacher => teacher.email === email)) {
    return res.status(409).json({ error: 'A teacher with that email already exists.' });
  }

  const teacher = {
    id: getNextId(data.teachers),
    name,
    email,
    password
  };
  data.teachers.push(teacher);
  saveData(data);

  res.status(201).json({ id: teacher.id, name: teacher.name, email: teacher.email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const data = loadData();
  const teacher = data.teachers.find(user => user.email === email && user.password === password);
  if (!teacher) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json({ id: teacher.id, name: teacher.name, email: teacher.email });
});

app.get('/api/grades/:gradeId/students', (req, res) => {
  const gradeId = req.params.gradeId;
  const data = loadData();
  const students = data.students[gradeId] || [];
  res.json(students);
});

app.post('/api/grades/:gradeId/students', (req, res) => {
  const gradeId = req.params.gradeId;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Student name is required.' });
  }

  const data = loadData();
  if (!data.students[gradeId]) {
    data.students[gradeId] = [];
  }

  const student = {
    id: getNextId(data.students[gradeId]),
    name,
    marks: { Math: 0, English: 0, Kiswahili: 0, Science: 0, SocialStudies: 0, PreTechnical: 0, CRE: 0 }
  };
  data.students[gradeId].push(student);
  saveData(data);

  res.status(201).json(student);
});

app.put('/api/grades/:gradeId/students/:studentId', (req, res) => {
  const gradeId = req.params.gradeId;
  const studentId = Number(req.params.studentId);
  const { marks } = req.body;
  if (!marks || typeof marks !== 'object') {
    return res.status(400).json({ error: 'A marks object is required.' });
  }

  const data = loadData();
  const students = data.students[gradeId] || [];
  const student = students.find(item => item.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  student.marks = { ...student.marks, ...marks };
  saveData(data);

  res.json(student);
});

app.delete('/api/grades/:gradeId/students/:studentId', (req, res) => {
  const gradeId = req.params.gradeId;
  const studentId = Number(req.params.studentId);
  const data = loadData();
  const students = data.students[gradeId] || [];
  const index = students.findIndex(item => item.id === studentId);
  if (index === -1) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  students.splice(index, 1);
  saveData(data);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
