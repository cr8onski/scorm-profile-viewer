const mongoose = require('mongoose');

// schema is here cuz i couldn't get array of type mixed in json file
var VRSchema = new mongoose.Schema({
    success: {
        type: Boolean,
        default: false
    },
    message: String,
    jsonschema: {
        id: String,
        link: String
    },
    errorset: [mongoose.Schema.Types.Mixed],
    statement: Object
}, {timestamps: true});

if (!VRSchema.options.toJSON) VRSchema.options.toJSON = {};
VRSchema.options.toJSON.transform = function(doc, ret, options) {
    delete ret._id;
    delete ret.__v;
    return ret;
};

module.exports = mongoose.model('ValidationResult', VRSchema);
