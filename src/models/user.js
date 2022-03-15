const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({

    firstName: {
        type: String,
        required: true

    },
    lastName: {
        type: String,
        required: true

    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['M', 'F']
    },
    hashedPassword: {
        type: String,
        required: true
    },
    mobile: {
        type: Number,
        required: true,
        unique: true
    },
    kyc: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: {}
    },
    bids: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: []
    },
    wallet: {
        type: Number,
        required: false,
        default: 25
    }

}, { timestamps: true })


const User = mongoose.model('User', userSchema);

module.exports = User;