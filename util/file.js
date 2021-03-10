const fs = require('fs');

const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            throw (err);
        }
    })//deletes file
}

exports.deleteFile = deleteFile;