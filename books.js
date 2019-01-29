/*
   Copyright 2016, Google, Inc.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var url = require('url');

module.exports = function(config) {

    //DATASTORE
	const { Datastore } = require("@google-cloud/datastore");
	const projectId = config.projectId;
	const datastore = new Datastore({
		projectId: projectId
	});

    // STORAGE
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage({ projectId });

    const bucket = storage.bucket(config.bucketName);

    function uploadCoverImage(coverImageData, callback) {
        // Generate a unique filename
        const filename = "" + new Date().getTime() + "-" + Math.random();
        const file = bucket.file(filename);
        const imageUrl = "https://" + config.bucketName + ".storage.googleapis.com/" + filename;
        const stream = file.createWriteStream();
        stream.on("error", callback);
        stream.on("finish", () => {
            // Set the file to be publiclly readable
            file.makePublic((err) => {
                if ( err ) return callback(err);
                callback(null, imageUrl)
            });
        });
        stream.end(coverImageData);
    }


  function getAllBooks(callback) {
    var query = datastore.createQuery(['Book']);
	datastore.runQuery(query, (err, books) => callback(err, books, datastore.KEY));
  }

  function getUserBooks(userId, callback) {
    const query = datastore.createQuery(['Book']).filter("userId", "=", userId);
    datastore.runQuery(query, (err, books) => callback(err, books, datastore.KEY))
  }

  function addBook(title, author, coverImageData, userId, callback) {
    const entity = {
        key: datastore.key('Book'),
        data: {
            title,
            author
        }
    };

     if (userId){
         entity.data.userId = userId;
     }
    
    if (coverImageData) {
        uploadCoverImage(coverImageData, (err, imageUrl) => {
            if ( err ) return callback(err);
            entity.data.imageUrl = imageUrl; 
        })
    }
    
    datastore.save(entity, callback);
  }

  function deleteBook(bookId, callback) {
  var key = datastore.key(['Book', parseInt(bookId, 10)]);

  datastore.get(key, function(err, book) {
    if (err) return callback(err);

    if (book.imageUrl) {
      var filename = url.parse(book.imageUrl).path.replace('/', '');
      var file = bucket.file(filename);
      file.delete(function(err) {
        if (err) return callback(err);
        datastore.delete(key, callback);
      });
    } else {
      datastore.delete(key, callback);
    }
  });
}

  return {
    getAllBooks: getAllBooks,
    getUserBooks: getUserBooks,
    addBook: addBook,
    deleteBook: deleteBook
  };
};
