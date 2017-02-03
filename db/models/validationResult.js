const mongoose = require('mongoose');
const debug = require('debug')('scorm-profile-viewer:validationResult');

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
    document: Object,
    type: String,
}, {timestamps: true});

if (!VRSchema.options.toJSON) VRSchema.options.toJSON = {};
VRSchema.options.toJSON.transform = function(doc, ret, options) {
    delete ret._id;
    delete ret.__v;
    return ret;
};

VRSchema.statics.normalize = function(err, doc, type, report, schema) {
    var VR = mongoose.model('ValidationResult', VRSchema);
    var vr = new VR({document: doc, type: type});
    if (err) {
        vr.message = err.message;
    }
    else if (report.totalErrors > 0) {
        // results of failed xapi statement
        vr.message = "Failed xAPI Statement validation with " + report.totalErrors + " error(s)";
        vr.jsonschema = undefined;
        for (var idx in report.results[0].errors) {
            var errinfo = report.results[0].errors[idx];
            vr.errorset.push({property: errinfo.trace, message: errinfo.message});
        }
    } else {
        // results against schema
        if (report.errors.length > 0) {
            vr.message = "Failed SCORM Profile validation with " +report.errors.length + " error(s)";
            for (var idx in report.errors) {
                var errinfo = report.errors[idx];
                vr.errorset.push({property: errinfo.property.replace("instance", "document"), message: errinfo.instance + " " + errinfo.message});
            }
        } else {
            vr.message = "OK";
            vr.success = true;
        }
        vr.jsonschema.id = schema.id;
        var parts = schema.id.split('/');
        vr.jsonschema.link = "/schemas/" + parts[parts.length - 1] + ".json";
    }
    return vr;
};

module.exports = mongoose.model('ValidationResult', VRSchema);
