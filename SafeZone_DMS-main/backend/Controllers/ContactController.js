const Contact = require("../models/Contact");
const { validateContactData, validateEmail, validatePhone } = require("../utils/validators");
const { buildPagination } = require("../utils/pagination");

class ContactController {
  // Create a new contact
  static async createContact(req, res) {
    try {
      const { name, email, phone, problem } = req.body;

      // Validation using helper functions
      const contactErrors = validateContactData(req.body);
      if (contactErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: contactErrors[0]
        });
      }

      const emailErrors = validateEmail(email);
      if (emailErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: emailErrors[0]
        });
      }

      const phoneErrors = validatePhone(phone);
      if (phoneErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: phoneErrors[0]
        });
      }

      const contact = new Contact({ name, email, phone, problem });
      await contact.save();

      res.status(201).json({ 
        success: true,
        message: "Contact form submitted successfully", 
        data: contact 
      });
    } catch (error) {
      console.error("Contact creation error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while creating contact" 
      });
    }
  }

  // Get all contacts
  static async getAllContacts(req, res) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const contacts = await Contact.find()
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Contact.countDocuments();

      res.json({
        success: true,
        data: contacts,
        pagination: buildPagination(page, limit, total, contacts, 'contacts')
      });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching contacts" 
      });
    }
  }

  // Get contact by ID
  static async getContactById(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findById(id);
      
      if (!contact) {
        return res.status(404).json({ 
          success: false,
          message: "Contact not found" 
        });
      }
      
      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error("Get contact by ID error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching contact" 
      });
    }
  }

  // Update contact
  static async updateContact(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, problem } = req.body;

      // Validation using helper functions
      const contactErrors = validateContactData(req.body);
      if (contactErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: contactErrors[0]
        });
      }

      const emailErrors = validateEmail(email);
      if (emailErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: emailErrors[0]
        });
      }

      const phoneErrors = validatePhone(phone);
      if (phoneErrors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: phoneErrors[0]
        });
      }

      const contact = await Contact.findByIdAndUpdate(
        id,
        { name, email, phone, problem },
        { new: true, runValidators: true }
      );

      if (!contact) {
        return res.status(404).json({ 
          success: false,
          message: "Contact not found" 
        });
      }

      res.json({
        success: true,
        message: "Contact updated successfully",
        data: contact
      });
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while updating contact" 
      });
    }
  }

  // Delete contact
  static async deleteContact(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findByIdAndDelete(id);
      
      if (!contact) {
        return res.status(404).json({ 
          success: false,
          message: "Contact not found" 
        });
      }
      
      res.json({ 
        success: true,
        message: "Contact deleted successfully" 
      });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while deleting contact" 
      });
    }
  }

  // Search contacts
  static async searchContacts(req, res) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({ 
          success: false,
          message: "Search query is required" 
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const searchRegex = new RegExp(query, 'i');
      const contacts = await Contact.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { problem: searchRegex }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const total = await Contact.countDocuments({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { problem: searchRegex }
        ]
      });

      res.json({
        success: true,
        data: contacts,
        pagination: buildPagination(page, limit, total, contacts, 'contacts')
      });
    } catch (error) {
      console.error("Search contacts error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while searching contacts" 
      });
    }
  }
}

module.exports = ContactController;
