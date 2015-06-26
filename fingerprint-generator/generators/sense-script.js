// TODO: move this utiltiy function to a proper place:)
 jQuery.fn.isOnScreen = function(){

    var win = jQuery(window);

    var viewport = {
        top : win.scrollTop(),
        left : win.scrollLeft()
    };
    viewport.right = viewport.left + win.width();
    viewport.bottom = viewport.top + win.height();

    var bounds = this.offset();
    bounds.right = bounds.left + this.outerWidth();
    bounds.bottom = bounds.top + this.outerHeight();

    return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

};

var Sense = (function () {
    var tree = { name: 'ROOT', nodes: [], path: ''};

    function walk(node, func, point) {
        var t = func(node, point),
            isVisible = jQuery(node).isOnScreen();

        if (t.offset.visible) {
            delete t.offset.visible;
            point.nodes.push(t);
            node = node.firstChild;
            while (node) {
                if(node.nodeType === 1 && node.tagName !== 'SCRIPT'){
                  walk(node, func, t);
                }
                node = node.nextSibling;
            }
            if (point.offset && isVisible) {
                setParentBoundaries(point, t);
            }
            if (t.offset.width === 0 || t.offset.height === 0) {
                point.nodes.pop();
            } else if (t.nodes.length === 0) {
                delete t.nodes;
            }
        }
    }

    function setParentBoundaries(parent, node) {
        var nodeTop         = node.offset.top,
            nodeLeft        = node.offset.left,
            nodeBottom      = node.offset.top + node.offset.height,
            nodeRight       = node.offset.left + node.offset.width,
            parentTop       = Math.min(nodeTop, parent.offset.top),
            parentLeft      = Math.min(nodeLeft, parent.offset.left),
            parentBottom    = Math.max(nodeBottom, parent.offset.top + parent.offset.height),
            parentRight     = Math.max(nodeRight, parent.offset.left + parent.offset.width);

        parent.offset.top = parentTop;
        parent.offset.left = parentLeft;
        parent.offset.width = parentRight - parentLeft;
        parent.offset.height = parentBottom - parentTop;
    }

    function build(node, parent) {
        var elem = {};

        elem.name                 = node.tagName;
        if(node.id !== '')        elem.name += '#' + node.id;
        if(node.className !== '') elem.name += '.' + node.className.split(' ').join('.');
        elem.path                 = parent.path + (parent.path ? ' ' : '') + elem.name;
        elem.style                = getStyleObject(node);
        elem.offset               = getPosition(node);
        elem.nodes                = [];

        return elem;
    }

    function getStyleObject(element){
        var style = getComputedStyle(element),
            styleObj = {},
            nameString,
            i;

        for(i = 0; i < style.length; i++) {
            nameString= style[i];
            styleObj[nameString] = style.getPropertyValue(nameString);
        }

        return styleObj;
    }


    function getPosition(node) {
        var $node = jQuery(node);

        return {
            top: Math.floor($node.offset().top),
            left: Math.floor($node.offset().left),
            width: Math.ceil($node.outerWidth()),
            height: Math.ceil($node.outerHeight()),
            visible: $node.is(':visible')
        }
    }


    function convertToJson() {
        return JSON.stringify(tree);
    }

    function init(node) {
        walk(node, build, tree);
    }

    init(document.body);

    return {
        init: init,
        getJSONFootprint: convertToJson
    }
}());
