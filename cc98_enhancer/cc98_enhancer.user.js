// ==UserScript==
// @id             cc98_enhancer
// @name           cc98 enhancer
// @version        0.0.1
// @namespace      soda@cc98.org
// @author         soda <sodazju@gmail.com>
// @description    
// @include        http://www.cc98.org/*
// @require        http://libs.baidu.com/jquery/2.0.3/jquery.min.js
// @require        http://soda-test-space.u.qiniudn.com/q.min.js
// @run-at         document-end
// ==/UserScript==

/* 长期目标
 * 1. libcc98.js
 * 2. 屏蔽功能（主题、用户）
 * 3. 设计全新的多账户界面
 * 4. 统一的管理界面
 * 5. ID 备注及其管理界面
 * 6. 自定义表情（从回复脚本独立出来）
 * 7. 改善原生回复功能

 * 其他小改进
 * 1. 事件管理界面增加快捷键
 */

(function() {


// a collection of simple browser-side JavaScript snippets

var chaos = {

    /**
     * Generates a GUID string, according to RFC4122 standards.
     * @returns {String} The generated GUID.
     * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
     * @author Slavik Meltser (slavik@meltser.info).
     * @link http://slavik.meltser.info/?p=142
     */
    guid: function() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    },

    // parse the url get parameters
    parseQS: function(url) {
        url = url.toLowerCase().split('#')[0]; // remove the hash part
        var t = url.indexOf('?');
        var hash = {};
        if (t >= 0) {
            var params = url.substring(t + 1).split('&');
        } else { // plain query string without '?' (e.g. in cookies)
            var params = url.split('&');
        }
        for (var i = 0; i < params.length; ++i) {
            var val = params[i].split('=');
            hash[decodeURIComponent(val[0])] = decodeURIComponent(val[1]);
        }
        return hash;
    },

    toQS: function(obj) {
        var ret = [];
        for (var key in obj) {
            if ('' === key) continue;
            if ('' === obj[key]) continue;
            ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
        }
        return ret.join('&');
    },

    parseURL: function(url) {
        // from JavaScript: The Good Parts
        var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/
        var arr = parse_url.exec(url);
        var result = {};
        result['url'] = arr[0];
        result['scheme'] = arr[1];
        result['slash'] = arr[2];
        result['host'] = arr[3];
        result['port'] = arr[4];
        result['path'] = arr[5];
        result['query'] = arr[6];
        result['hash'] = arr[7];
        return result;
    },

    parseCookies: function(theCookie) {
        var cookies = {}; // The object we will return
        var all = theCookie; // Get all cookies in one big string
        if (all === '') // If the property is the empty string
            return cookies; // return an empty object
        var list = all.split('; '); // Split into individual name=value pairs
        for (var i = 0; i < list.length; i++) { // For each cookie
            var cookie = list[i];
            var p = cookie.indexOf('='); // Find the first = sign
            var name = cookie.substring(0, p); // Get cookie name
            var value = cookie.substring(p + 1); // Get cookie value
            value = decodeURIComponent(value); // Decode the value
            cookies[name] = value; // Store name and value in object
        }
        return cookies;
    },

    // 将部分常见的转义后的html转回来
    unescapeHTML: function(input) {
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
    },

    // deprecated
    // 建议用 q-http 模块的 ajax 函数，该函数返回一个 promise，更方便异步编程 
    ajax: function(opts) {
        opts = {
            type: opts.type || 'GET',
            url: opts.url || '',
            data: opts.data || null,
            contentType: opts.contentType || 'application/x-www-form-urlencoded; charset=UTF-8',
            success: opts.success || function() {},
            async: opts.async || (opts.async === undefined)
        };

        // Chrome 没有sendAsBinary函数，这里是一个实现
        if (!XMLHttpRequest.prototype.sendAsBinary) {
            XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
                function byteValue(x) {
                    return x.charCodeAt(0) & 0xff;
                }
                var ords = Array.prototype.map.call(datastr, byteValue);
                var ui8a = new Uint8Array(ords);
                this.send(ui8a);
            };
        }


        var xhr = new XMLHttpRequest();
        if (opts.type === 'GET') {
            opts.url += opts.data ? ('?' + chaos.toQS(opts.data)) : '';
        }
        xhr.open(opts.type, opts.url, opts.async);
        if (opts.contentType) {
            xhr.setRequestHeader('Content-type', opts.contentType);
        }
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                opts.success(xhr.responseText);
            }
        };

        // GET Request
        if (opts.type === 'GET') {
            xhr.send();
            return;
        }

        // POST Request
        if (opts.contentType === 'application/x-www-form-urlencoded; charset=UTF-8') {
            xhr.send(chaos.toQS(opts.data));
        } else {
            xhr.sendAsBinary(opts.data)
        }
    },

    get: function(url, data, calllback) {
        if (typeof data === 'function') {
            callback = data;
            data = null;
        }
        this.ajax({
            type: 'GET',
            url: url,
            data: data,
            success: callback
        });
    },

    post: function(url, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = null;
        }
        this.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: callback
        });
    },

    // @param {string} url sth like 'http://example.com/service?callback={callback}', which is the same as YUI's jsonp function
    jsonp: function(url, callback) {
        var proxy = function() {
            callback.aplly(this, arguments);
        };
        var prefix = '_CHAOS_JSONP_'
        var name = prefix + chaos.guid().replace(/-/g, '_'); // generate a unique valid function name
        global = unsafeWindow || window; // for compatibility with GM scripts
        global[name] = proxy;

        var script = document.createElement('script');
        var url = url.replace('{callback}', name);

        script.src = url;
        script.onload = function() {
            document.removeChild(script);
        };

        document.body.appendChild(script);
    },

    // xpath query
    //@return {Array}   返回由符合条件的DOMElement组成的数组
    xpath: function(expr, contextNode) {
        contextNode = contextNode || document;
        var xresult = document.evaluate(expr, contextNode, null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var xnodes = [];
        var xres;
        while (xres = xresult.iterateNext()) {
            xnodes.push(xres);
        }

        return xnodes;
    },

    // 添加CSS
    addStyles: function(css) {
        var head = document.getElementsByTagName('head')[0];
        var style = document.createElement('style');

        style.setAttribute('type', 'text/css');
        style.innerHTML = css;
        head.appendChild(style);
    },

    // 计算字符串字节数
    // from http://imatlas.com/posts/js-count-string-bytes/
    sizeof: function(str, charset) {
        charset = charset || 'utf-8';
        charset = charset.toLowerCase();

        var total = 0;

        if (charset === 'utf-16' || charset === 'utf16') {
            for (var i = 0; i != str.length; ++i) {
                if (str.charCodeAt(i) <= 0xffff) {
                    total += 2;
                } else {
                    total += 4;
                }
            }
        } else {
            for (var i = 0; i != str.length; ++i) {
                var code = str.charCodeAt(i)
                if (code <= 0x007f) {
                    total += 1;
                } else if (code <= 0x07ff) {
                    total += 2;
                } else if (code <= 0xffff) {
                    total += 3;
                } else {
                    total += 4;
                }
            }
        }
        return total;
    }
};


// simple helper functions to help write modular JavaScript
// from: http://leechan.me/?p=1241
// modified by soda<sodazju@gmail.com>
(function(global) {
    var modules = {}, cached = {};

    // @usage: define('id', function(exports, module) {});
    global.define = function(id, func) {
        modules[id] = {};
        if (func instanceof Function) {
            modules[id].factory = func;
        } else {
            modules[id].exports = func;
        }
    };

    // @usage: var a = require('id');
    global.require = function(id) {
        if (cached[id]) {
            return cached[id];
        } else {
            return cached[id] = (modules[id].exports || modules[id].factory(modules[id].exports = {}, modules[id]) || modules[id].exports);
        }
    };
})(this);


// 本项目中用了自定义的 define 和 require 函数
// 而 chaos.js 本身并不是模块化的
// jQuery 仅支持 AMD 规范的模块加载
// q.js 也与不能直接用于自定义的 define/require
// 故为了保持接口的一致性增加了这两句（考虑到这些库都已经放到了全局命名空间，所以这真的仅仅是为了看上去模块化一点）

_chaos = chaos;
define('chaos', _chaos);

// 因为 jQuery 对象是一个函数，直接作为参数传入的话会导致它被当作一个 factory 函数运行，所以只能 return
define('jQuery', function(exports, module) {
    return jQuery.noConflict();
});

// Q 同 jQuery
define('Q', function(exports, module) {
    return Q;
});


// a browser-side http library using Q libray to implement promise
define('q-http', {
    ajax: function(opts) {
        opts = {
            type: opts.type || 'GET',
            url: opts.url || '',
            data: opts.data || null,
            contentType: opts.contentType || 'application/x-www-form-urlencoded; charset=UTF-8',
            success: opts.success || function() {},
            error: opts.error || function() {},
            async: opts.async || (opts.async === undefined)
        };

        var chaos = require('chaos');
        var Q = require('Q');

        var deferred = Q.defer();

        // Chrome 没有sendAsBinary函数，这里是一个实现
        if (!XMLHttpRequest.prototype.sendAsBinary) {
            XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
                function byteValue(x) {
                    return x.charCodeAt(0) & 0xff;
                }
                var ords = Array.prototype.map.call(datastr, byteValue);
                var ui8a = new Uint8Array(ords);
                this.send(ui8a);
            };
        }

        var xhr = new XMLHttpRequest();

        if (opts.type === 'GET') {
            opts.url += opts.data ? ('?' + chaos.toQS(opts.data)) : '';
        }

        xhr.open(opts.type, opts.url, opts.async);

        if (opts.contentType) {
            xhr.setRequestHeader('Content-type', opts.contentType);
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    deferred.resolve(xhr.responseText);
                } else {
                    deferred.reject('HTTP ' + xhr.status + 'for ' + opts.url);
                }
            }
        };

        if (opts.type === 'GET') {
            xhr.send();
        } else if (opts.contentType === 'application/x-www-form-urlencoded; charset=UTF-8') {
            xhr.send(chaos.toQS(opts.data));
        } else {
            xhr.sendAsBinary(opts.data);
        }

        return deferred.promise.then(opts.success, opts.error);
    },

    get: function(url, data, success, error) {
        if (typeof data === 'function') {
            error = success;
            success = data;
            data = null;
        }
        return this.ajax({
            type: 'GET',
            url: url,
            data: data,
            success: success,
            error: error
        });
    },

    post: function(url, data, success, error) {
        if (typeof data === 'function') {
            error = success;
            success = data;
            data = null;
        }
        return this.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: success,
            error: error
        });
    }
});





define('CC98URLMap', function(exports, module) {
    // 默认文件上传到的版面：论坛帮助
    // 允许 gif|docx|xlsx|pptx|pdf|xap|jpg|jpeg|png|bmp|rar|txt|zip|mid|rm|doc|mp3
    var DEFAULT_UPLOAD_BOARDID = 184;

    // 其他文件扩展名与允许上传的boardid的对应列表
    var file2boardid = {
        'ipa': 598, // iOS
        'ppt': 598,
        'xls': 598,
        'chm': 598,
        'wma': 169, // 摇滚和独立音乐
        'lrc': 169,
        'asf': 169,
        'flv': 169,
        'wmv': 169,
        'rmvb': 169,
        'mpg': 169,
        'avi': 169,
        'swf': 170, // 史海拾贝
        'rep': 200, // 星际专区
        'tar': 212, // Linux天地
        'gz': 212,
        'bz2': 212,
        'tbz': 212,
        'tgz': 212,
        'psd': 239, // 贴图工坊
        'gtp': 308, // 乱弹吉他
        'gp3': 308,
        'gp4': 308,
        'gp5': 308,
        'torrent': 499, // 多媒体技术
        'srt': 499
    };

    var baseURL = 'http://www.cc98.org/';

    var that = {};

    // 发米
    that.famiURL = function() {
        return 'http://www.cc98.org/master_users.asp?action=award';
    }

    // 上传
    that.uploadURL = function(filename) {
        var ext = file.name.substring(file.name.lastIndexOf('.') + 1);
        var boardid = file2boardid[ext] || DEFAULT_UPLOAD_BOARDID;
        return 'http://www.cc98.org/saveannouce_upfile.asp?boardid=' + boardid;
    }

    // postURL 发新帖

    // 回复
    that.replyURL = function(boardid) {
        return 'http://www.cc98.org/SaveReAnnounce.asp?method=Topic&boardid=' + boardid;
    }

    // 编辑
    that.editURL = function(boardid, id, replyid) {
        return 'http://www.cc98.org/SaveditAnnounce.asp?boardid=' + boardid + '&id=' + id + '&replyid=' + replyid;
    }

    // 站短
    that.pmURL = function() {
        return 'http://www.cc98.org/messanger.asp?action=send';
    }

    // 登录
    that.loginURL = function() {
        return 'http://www.cc98.org/login.asp';
    }

    module.exports = that;

});


define('libcc98', function(exports, module) {
    var Q = require('Q');
    var chaos = require('chaos');
    // 不用 jQuery 的 ajax 而用自己写的 q-http 模块
    // 一则因为 jquery.min.js 达 87k，远大于 Q 的大小（YUI 压缩后 17k）
    // 二则是为了练手
    var http = require('q-http');
    var CC98URLMap = require('CC98URLMap');

    // 从 cookie 中获取
    var userInfo;


    var parseTopicList = function(html) {
        var dom;
        if (!html) {
            dom = document;
        } else {
            dom = document.implementation.createHTMLDocument('');
            dom.documentElement.innerHTML = html;
        }

        // for test
        return dom.querySelectorAll('tr[style="vertical-align: middle;"]');
    };
    var parseThreadList = function(html) {};

    var libcc98 = {};

    libcc98.getTopicList = function(url, callback) {
        var deferred, promise;

        if (callback instanceof Function) {
            libcc98.getTopicList(url).then(callback);
        }

        if (chaos.parseURL(url)['path'] !== 'list.asp') {
            return;
        }

        if (url === location.href) {
            deferred = Q.defer();
            promise = deferred.promise.then(parseTopicList);
            deferred.resolve(''); // 不传任何返回值到 parseTopicList，用来告知它现在是在解析当前页
        } else {
            promise = http.get(url, parseTopicList);
        }

        return promise;
    };

    libcc98.getThreadList = function(url, callback) {
        var deferred = Q.defer();

        if (callback instanceof Function) {
            libcc98.getThreadList(url).then(callback);
        }

        if (chaos.parseURL(url)['path'] !== 'dispbbs.asp') {
            return;
        }
    };

    libcc98.test = function() {
        libcc98.getTopicList('http://www.cc98.org/list.asp?boardid=182').then(function(topics) {
            console.log(topics);
        });
    };

    return libcc98;
});


define('options', function(exports, module) {
    // 用户实际存下来的 options 数据
    var options = {};
    // 默认选项
    var DEFAULT_OPTIONS = {
        /*
        "autoSaveInterval": 30,           // 自动保存间隔(秒)，必须是10的倍数

        "promptString": '>>查看原帖<<',   // 原帖链接的提示文字
        "promptColor": 'royalblue',       //「查看原帖」的颜色

        "replyTail": "",                  // 小尾巴
        "defaultReplyContent": '\n',      // 文本框为空时的默认回复内容

        "useRelativeURL": true,           // 使用相对链接
        "disableInXinlin": false,         // 在心灵禁用这些设置
        "showFastReplyButton": true,      // 显示快速回复按钮
        "alwaysShowEmotions": false,      // 始终显示表情菜单
        "modifierKey": "alt",             // 快速回复快捷键组合的modifier key
        "hotKeyCode": 82,                 // 快速回复快捷键组合中字母的keyCode
        */

        "blocked_users": ["竹林来客", "燕北飞", "cft", "cone", "Uglyzjuer"],
    };

    var Options = {}; // 用于操作 options 数据的对象

    Options.save = function(options) {
        localStorage.setItem('enhancer_options', JSON.stringify(options));
    }

    Options.restore = function() {
        var options = JSON.parse(localStorage.getItem('enhancer_options')) || {};

        // 如果新增了默认配置项，则加入到原配置中
        for (var prop in DEFAULT_OPTIONS) {
            if (options[prop] === undefined) {
                options[prop] = DEFAULT_OPTIONS[prop];
            }
        }
        Options.save(options);

        return options;
    }

    Options.get = function(key) {
        return options[key];
    }

    Options.set = function(key, value) {
        options[key] = value;
        Options.save();
    }

    Options.delete = function(key) {
        delete options[key];
        Options.save();
    }

    Options.show = function() {
        // 覆盖整个页面的遮罩层、绝对定位的选项卡（50%~80% width）
        // 点确认/取消隐藏界面
        console.log('options.show');
    }

    Options.init = function() {
        var options = Options.restore();
        var $ = require('jQuery');

        (unsafeWindow ? unsafeWindow : window).manage2 += '<br><a id="enhancer-options" href="javascript:void(0)">cc98 enhancer 选项</a>';
        $('#menuDiv').on('click', '#enhancer-options', Options.show);
    }

    module.exports = Options;
});


define('utils', function(exports, module) {
    var utils = {};

    var chaos = require('Chaos');
    var cc98 = require('CC98');
    var options = require('Options');
    var $ = require('jQuery');

    utils.blockTopic = function() {};

    utils.blockThread = function() {};

    module.exports = utils;
});


// @require chaos.js
// @require libcc98.js
// @require jquery

define('alias', function(exports, module) {
    // 显示备注管理界面
    function showAliasesManager() {}
});


// 在原生回复框下方加入表情菜单（可自定义）





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


})();