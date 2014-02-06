(function(pangu) {

    /*
     1.
     硬幹 contentEditable 元素的 child nodes 還是會被 spacing 的問題
     因為 contentEditable 的值可能是 'true', 'false', 'inherit'
     如果沒有顯式地指定 contentEditable 的值
     一般都會是 'inherit' 而不是 'false'

     2.
     不要對特定 tag 裡的文字加空格
     關於這個我還不是很確定
     所以先註解掉

     TODO:
     太暴力了，應該有更好的解法
     */
    function can_ignore_node(node) {
        var parent_node = node.parentNode;
        // var ignore_tags = /^(code|pre)$/i;
        // var ignore_tags = /^(textarea)$/i;
        while (parent_node) {
            if (parent_node.contentEditable == 'true') {
                return true;
            }
            // else if (parent_node.nodeName.search(ignore_tags) >= 0) {
            //     return true;
            // }
            else {
                parent_node = parent_node.parentNode;
            }
        }

        return false;
    }

    /*
     nodeType: http://www.w3schools.com/dom/dom_nodetype.asp
     1: ELEMENT_NODE
     3: TEXT_NODE
     8: COMMENT_NODE
     */
    function is_first_text_child(parent_node, target_node) {
        var child_nodes = parent_node.childNodes;

        // 只判斷第一個含有 text 的 node
        for (var i = 0; i < child_nodes.length; i++) {
            child_node = child_nodes[i];
            if (child_node.nodeType != 8 && child_node.textContent) {
                return child_node == target_node;
            }
        }

        return false;
    }

    function is_last_text_child(parent_node, target_node) {
        var child_nodes = parent_node.childNodes;

        // 只判斷倒數第一個含有 text 的 node
        for (var i = child_nodes.length - 1; i > -1; i--) {
            child_node = child_nodes[i];
            if (child_node.nodeType != 8 && child_node.textContent) {
                return child_node == target_node;
            }
        }

        return false;
    }

    function insert_space(text) {
        var old_text = text;
        var new_text;

        /*
         ~!@#$%^&*()_+`-=
         []\{}|
         :;"'
         <>?,./

         3000−303F 中日韩符号和标点
         3040−309F 日文平假名
         30A0−30FF 日文片假名
         3100−312F 注音字母
         4E00−9FFF 中日韩统一表意文字
         F900−FAFF 中日韩兼容表意文字
         http://unicode-table.com/cn/
         */

        // 前面"字"後面 >> 前面 "字" 後面
        text = text.replace(/([\u4e00-\u9fa5\u3040-\u30FF])(["'#])/ig, '$1 $2');
        text = text.replace(/(["'#])([\u4e00-\u9fa5\u3040-\u30FF])/ig, '$1 $2');

        // 避免出現 '前面 " 字" 後面' 之類的不對稱的情況
        text = text.replace(/(["'#]+)(\s*)(.*?)(\s*)(["'#]+)/ig, '$1$3$5');

        // 1. 前面<字>後面 --> 前面 <字> 後面
        old_text = text
        new_text = old_text.replace(/([\u4e00-\u9fa5\u3040-\u30FF])([<\[\{\(]+(.*?)[>\]\}\)]+)([\u4e00-\u9fa5\u3040-\u30FF])/ig, '$1 $2 $4');
        text = new_text
        if (old_text == new_text) {
            // 前面<後面 --> 前面 < 後面
            text = text.replace(/([\u4e00-\u9fa5\u3040-\u30FF])([<>\[\]\{\}\(\)])/ig, '$1 $2');
            text = text.replace(/([<>\[\]\{\}\(\)])([\u4e00-\u9fa5\u3040-\u30FF])/ig, '$1 $2');
        }
        // 避免出現 "前面 [ 字] 後面" 之類的不對稱的情況
        text = text.replace(/([<\[\{\(]+)(\s*)(.*?)(\s*)([>\]\}\)]+)/ig, '$1$3$5');

        // 2. 前面<字>後面 --> 前面 < 字 > 後面
        // text = text.replace(/([\u4e00-\u9fa5\u3040-\u30FF])([<>\[\]\{\}\(\)])/ig, '$1 $2');
        // text = text.replace(/([<>\[\]\{\}\(\)])([\u4e00-\u9fa5\u3040-\u30FF])/ig, '$1 $2');

        // 中文在前
        text = text.replace(/([\u4e00-\u9fa5\u3040-\u30FF])([a-z0-9@&=`\|\$\%\^\*\-\+\/\\])/ig, '$1 $2');

        // 中文在後
        text = text.replace(/([a-z0-9!~&;=`\|\,\.\:\?\$\%\^\*\-\+\/\\])([\u4e00-\u9fa5\u3040-\u30FF])/ig, '$1 $2');

        return text;
    }

    function spacing(xpath_query) {
        // 是否加了空格
        var had_spacing = false;

        /*
         因為 xpath_query 用的是 text()，所以這些 nodes 是 text 而不是 DOM element
         https://developer.mozilla.org/en-US/docs/DOM/document.evaluate
         http://www.w3cschool.cn/dom_xpathresult.html

         snapshotLength 要配合 XPathResult.ORDERED_NODE_SNAPSHOT_TYPE 使用
         */
        var text_nodes = document.evaluate(xpath_query, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        var nodes_length = text_nodes.snapshotLength;

        var next_text_node;

        // 從最下面、最裡面的節點開始
        for (var i = nodes_length - 1; i > -1; --i) {
            var current_text_node = text_nodes.snapshotItem(i);
            // console.log('current_text_node: %O, nextSibling: %O', current_text_node.data, current_text_node.nextSibling);
            // console.log('next_text_node: %O', next_text_node);

            if (can_ignore_node(current_text_node)) {
                next_text_node = current_text_node;
                continue;
            }

            // http://www.w3school.com.cn/xmldom/dom_text.asp
            var new_data = insert_space(current_text_node.data);
            if (current_text_node.data != new_data) {
                had_spacing = true;
                current_text_node.data = new_data;
            }

            // 處理嵌套的 <tag> 中的文字
            if (next_text_node) {
                /*
                 TODO:
                 現在只是簡單地判斷相鄰的下一個 node 是不是 <br>
                 萬一遇上嵌套的標籤就不行了
                 */
                if (current_text_node.nextSibling) {
                    if (current_text_node.nextSibling.nodeName.search(/^(br|hr)$/i) >= 0) {
                        next_text_node = current_text_node;
                        continue;
                    }
                }

                // current_text_node 的最後一個字 + next_text_node 的第一個字
                var text = current_text_node.data.toString().substr(-1) + next_text_node.data.toString().substr(0, 1);
                var new_text = insert_space(text);

                if (text != new_text) {
                    had_spacing = true;

                    /*
                     基本上
                     next_node 就是 next_text_node 的 parent node
                     current_node 就是 current_text_node 的 parent node
                     */

                    // 不要把空格加在 <space_sensitive_tags> 裡的文字的開頭或結尾
                    var space_sensitive_tags = /^(a|del|pre|s|strike|u)$/i;

                    var block_tags = /^(div|h1|h2|h3|h4|h5|h6|p)$/i;

                    /*
                     往上找 next_text_node 的 parent node
                     直到遇到 space_sensitive_tags
                     而且 next_text_node 必須是第一個 text child
                     才能把空格加在 next_text_node 的前面
                     */
                    var next_node = next_text_node;
                    while (next_node.parentNode
                        && next_node.nodeName.search(space_sensitive_tags) == -1
                        && is_first_text_child(next_node.parentNode, next_node)) {
                        next_node = next_node.parentNode;
                    }
                    // console.log('next_node: %O', next_node);

                    var current_node = current_text_node;
                    while (current_node.parentNode
                        && current_node.nodeName.search(space_sensitive_tags) == -1
                        && is_last_text_child(current_node.parentNode, current_node)) {
                        current_node = current_node.parentNode;
                    }
                    // console.log('current_node: %O, nextSibling: %O', current_node, current_node.nextSibling);

                    if (current_node.nodeName.search(block_tags) == -1) {
                        if (next_node.nodeName.search(space_sensitive_tags) == -1) {
                            if (next_node.nodeName.search(block_tags) == -1) {
                                // console.log('spacing 1: %O', next_text_node.data);
                                next_text_node.data = " " + next_text_node.data;
                            }
                        }
                        else if (current_node.nodeName.search(space_sensitive_tags) == -1) {
                            // console.log('spacing 2: %O', current_text_node.data);
                            current_text_node.data = current_text_node.data + " ";
                        }
                        else {
                            // console.log('spacing 3: %O', next_node.parentNode);
                            next_node.parentNode.insertBefore(document.createTextNode(" "), next_node);
                        }
                    }
                }
            }

            next_text_node = current_text_node;
        }

        return had_spacing;
    }

    pangu.text_spacing = function(text) {
        return insert_space(text);
    };

    pangu.page_spacing = function() {
        // var p = 'page_spacing';
        // console.profile(p);
        // console.time(p);
        // var start = new Date().getTime();

        /*
         // >> 任意位置的節點
         . >> 當前節點
         .. >> 父節點
         [] >> 條件
         text() >> 節點的文字內容，例如 hello 之於 <tag>hello</tag>

         [@contenteditable]
         帶有 contenteditable 屬性的節點

         normalize-space(.)
         當前節點的頭尾的空白字元都會被移除，大於兩個以上的空白字元會被置換成單一空白
         https://developer.mozilla.org/en-US/docs/XPath/Functions/normalize-space

         name(..)
         父節點的名稱
         https://developer.mozilla.org/en-US/docs/XPath/Functions/name

         translate(string, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
         將 string 轉換成小寫，因為 XML 是 case-sensitive 的
         https://developer.mozilla.org/en-US/docs/XPath/Functions/translate

         1. 處理 <title>
         2. 處理 <body> 底下的節點
         3. 略過 contentEditable 的節點
         4. 略過特定節點，例如 <script> 和 <style>

         注意，以下的 query 只會取出各節點的 text 內容！
         */
        var title_query = '/html/head/title/text()';
        spacing(title_query);

        var body_query = '/html/body//*[not(@contenteditable)]/text()[normalize-space(.)]';
        var body_query = '/html/body//*/text()[normalize-space(.)]';
        ['script', 'style', 'textarea'].forEach(function(tag) {
            /*
             理論上這幾個 tag 裡面不會包含其他 tag
             所以可以直接用 .. 取父節點

             ex: [translate(name(..), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") != "script"]
             */
            body_query += '[translate(name(..),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")!="' + tag + '"]';
        });
        var had_spacing = spacing(body_query);

        // console.profileEnd(p);
        // console.timeEnd(p);
        // var end = new Date().getTime();
        // console.log(end - start);

        return had_spacing;
    };

    pangu.element_spacing = function(selector_string) {
        var xpath_query;

        if (selector_string.indexOf('#') === 0) {
            var target_id = selector_string.substr(1, selector_string.length - 1);

            // ex: id("id_name")//text()
            xpath_query = 'id("' + target_id + '")//text()';
        }
        else if (selector_string.indexOf('.') === 0) {
            var target_class = selector_string.slice(1);

            // ex: //*[contains(concat(' ', normalize-space(@class), ' '), ' class_name ')]/text()
            xpath_query = '//*[contains(concat(" ", normalize-space(@class), " "), " ' + target_class + ' ")]/text()';
        }
        else {
            var target_tag = selector_string;

            // ex: //tag_name/text()
            xpath_query = '//' + target_tag + '//text()';
        }

        var had_spacing = spacing(xpath_query);

        return had_spacing;
    };

}(window.pangu = window.pangu || {}));
