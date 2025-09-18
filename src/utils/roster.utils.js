import csv from 'csv-parser';
import { Readable } from 'stream';

export const parseCSVBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const students = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim(),
        })
      )
      .on('data', (row) => {
        // Normalize common CSV column names
        const student = {
          name:
            row.name ||
            row['full name'] ||
            row['student name'] ||
            `${row['first name'] || ''} ${row['last name'] || ''}`.trim(),
          email: row.email || row['email address'] || row.mail,
          studentId:
            row.studentid ||
            row['student id'] ||
            row.id ||
            row['reg no'] ||
            row.regno,
          matricNumber:
            row.matric ||
            row['matric number'] ||
            row.matricnumber ||
            row.matricNumber,
          // Add other fields as needed
        };

        // Only add if we have essential data
        if (student.name && (student.email || student.studentId)) {
          students.push(student);
        }
      })
      .on('end', () => resolve(students))
      .on('error', reject);
  });
};

import User from '../models/User.js';

export const processStudentData = async (
  students,
  schoolId,
  matchStrategy = ['matricNumber', 'email']
) => {
  const matchedStudents = [];
  const unmatchedStudents = [];
  const rosterStudents = [];

  // 🔹 Normalize incoming CSV data
  const cleaned = students.map((s) => ({
    firstName: s.firstName?.trim() || '',
    lastName: s.lastName?.trim() || '',
    email: s.email?.toLowerCase().trim() || '',
    matricNumber: s.matricNumber?.toString().trim().toUpperCase() || '', // enforce uppercase
  }));

  // 🔹 Collect all unique identifiers for bulk lookup
  const emails = cleaned.map((s) => s.email).filter(Boolean);
  const matricNumbers = cleaned.map((s) => s.matricNumber).filter(Boolean);

  // 🔹 Bulk query instead of N+1
  const users = await User.find({
    schoolId,
    role: 'student',
    $or: [
      ...(emails.length ? [{ email: { $in: emails } }] : []),
      ...(matricNumbers.length
        ? [{ matricNumber: { $in: matricNumbers } }]
        : []),
    ],
  }).lean();

  // 🔹 Build quick lookup maps
  const userByEmail = new Map(users.map((u) => [u.email, u]));
  const userByMatric = new Map(users.map((u) => [u.matricNumber, u]));

  // 🔹 Process each student
  for (const s of cleaned) {
    let existingUser = null;
    let matchedAt = null;

    // Respect matchStrategy priority
    if (
      matchStrategy.includes('matricNumber') &&
      s.matricNumber &&
      userByMatric.has(s.matricNumber)
    ) {
      existingUser = userByMatric.get(s.matricNumber);
      matchedAt = 'matricNumber';
    } else if (
      matchStrategy.includes('email') &&
      s.email &&
      userByEmail.has(s.email)
    ) {
      existingUser = userByEmail.get(s.email);
      matchedAt = 'email';
    }

    // Build roster entry in schema shape
    const rosterStudent = {
      firstName: existingUser?.firstName || s.firstName,
      lastName: existingUser?.lastName || s.lastName,
      email: existingUser?.email || s.email || null,
      matricNumber: existingUser?.matricNumber || s.matricNumber || null,
      userId: existingUser?._id || null,
      isInvited: !!existingUser,
      hasJoined: !!existingUser,
      matchedAt: existingUser ? new Date() : null,
      matchType: matchedAt,
    };

    rosterStudents.push(rosterStudent);

    if (existingUser) {
      matchedStudents.push(existingUser);
    } else {
      unmatchedStudents.push(s);
    }
  }

  return {
    matchedStudents,
    unmatchedStudents,
    rosterStudents,
  };
};
