const express = require('express');
const Contact = require('../models/Contact');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Add contact
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const contact = new Contact({ name, email, phone, address, userId: req.user.id });
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get contacts for user
router.get('/', auth, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
