requirejs.config({
  "baseUrl": "js/lib",
  "paths": {
    "app": "../app",
    "data": "../data",
    "classes": "../classes",
    "jquery": "https://code.jquery.com/jquery-3.3.1.min"
  }
});

requirejs(["app/main"]);
