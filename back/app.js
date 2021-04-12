var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

//===========================================================================================
//===========================================================================================
//ファイル読み込み用

var manageImport = (function () {
  var listFiles, formatFileList, default_callback;
  var app, base_uri, use_list;

  listFiles = function(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
      .flatMap(function(dirent) {
  
      return dirent.isFile() ? [`/${dirent.name}`] : listFiles(`/${dirent.name}`);
    })
  };
  
  formatFileList = function (file_list) {
    
    var i_of_index_file = file_list.indexOf('/index.js');
    if (i_of_index_file === -1 ) {
      return file_list;
    }
    file_list.splice(i_of_index_file, i_of_index_file+1);
    file_list.unshift('/index.js');
    return file_list;
  };

  default_callback = function(api) {
    if (api === '/index') {
      api = '/';
    }
    return api;
  };

  app = null;
  base_uri = null;
  use_list = [];

  return {
    setApp: function (_app) {
      app = _app;
      return this;
    },
    setBaseUri: function (_base_uri) {
      base_uri = _base_uri;
      return this;
    },

    setFileToList : function (callBack = null) {
      if (callBack === null) {
        callBack = default_callback;
      }
      file_list = formatFileList(listFiles(base_uri));

      for (var i = 0; i < Object.keys(file_list).length; ++i) {
        var api = file_list[i].replace( /.js/g , ""),
            api_handler = require(base_uri + api);
        
        api = callBack(api);
        use_list[api] = api_handler;
      }
      // console.log(use_list)
      return this;
    },

    useApp : function (target_list=null) {
      if (target_list === null) {
        target_list = use_list
      }

      for (var api_key in target_list) {

        

        if (typeof(target_list[api_key]) === 'object') {
          
  
          for (var api_key2 in target_list[api_key]) {
            // console.log(target_list[api_key][api_key2]);
            if (api_key === 'app') {
              //APP全体に当てるミドルウェア
              app.use(target_list[api_key][api_key2]);
              continue;
            }

            if (typeof(target_list[api_key][api_key2]) === 'function') {
              if (isNaN(parseInt(api_key2)) === true) {
                app.use(api_key2, target_list[api_key][api_key2]);
              }
              continue;
            }

            

          }
        } else {
          if (typeof(target_list[api_key]) === 'function') {
            app.use(api_key, target_list[api_key]);
          }
        }
        

      }
    },
  };

})();


//===========================================================================================
//===========================================================================================
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//===========================================================================================
//===========================================================================================
//ルーティングを設定

manageImport.setApp(app)
  .setBaseUri('./app/Http/MiddleWare')
  .setFileToList()
  .useApp();

// manageImport.setApp(app)
//   .setBaseUri('./routes')
//   .setFileToList()
//   .useApp();

//===========================================================================================
//===========================================================================================
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
