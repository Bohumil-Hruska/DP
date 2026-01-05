// services/notesService.js
const fs = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '..', 'notes.json');

function loadNotes() {
    if (!fs.existsSync(NOTES_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

function saveNotes(notes) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

function addNote(text) {
    const notes = loadNotes();
    const note = { id: Date.now().toString(), text, createdAt: new Date().toISOString() };
    notes.unshift(note);
    saveNotes(notes);
    return note;
}

function listNotes(limit = 5) {
    const notes = loadNotes();
    return notes.slice(0, limit);
}

module.exports = { addNote, listNotes };
