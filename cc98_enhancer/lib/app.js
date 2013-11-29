define('app', function(exports, module) {
    var app = {};

    var chaos = require('chaos');
    var options = require('options');
    var libcc98 = require('libcc98');

    var isTopicList = (location.pathname === '/list.asp');
    var isThreadList = (location.pathname === '/dispbbs.asp');
    var isXinlin = (chaos.parseQS(location.search)['boardid'] === '182');

    app.route = function(cond, func) {
        if (cond) {
            func();
        }
    };

    app.init = function() {
        app.route(true, options.init); // 给每个界面加上选项菜单
        app.route(true, libcc98.test); // 测试 libcc98 组件
    };

    module.exports = app;
});

var app = require('app');
app.init();