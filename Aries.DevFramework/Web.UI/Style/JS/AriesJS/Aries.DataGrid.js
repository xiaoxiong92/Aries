﻿
+function ($, $Core) {
    //==================================Internal Function Region======================================================
    $Core.DataGrid = DataGrid;
    /**
        *objName：视图名，表名，或者sql文件指定的路径
        *tbName:指定的操作主表名称
        *id 默认值 dg       
        */
    function DataGrid(objName, tbName, id) {
        //内部变量
        this.Internal = {
            type: "datagrid",
            id: id || 'dg',
            toolbarID: "div_toolbar_" + $Core.Global.DG.Items.length,
            btn_query_id: "btn_query_" + $Core.Global.DG.Items.length,
            btn_reset_id: "btn_reset_" + $Core.Global.DG.Items.length,
            buttons: new Array(),
            primarykey: null,
            headerData: new Array()
        }
        //主表名
        this.tableName = tbName || objName;
        //视图名称
        this.viewName = objName;
        //是否显示复选框
        this.isShowCheckBox = true;
        //是否显示工具区（包括查询区和按钮区）
        this.isShowToolArea = true;
        //是否启用行内编辑
        this.isEditor = false;
        this.options = {
            //需要追求的请求数据(GetHeader也会追加）。
            queryParams: {},
            defaultWhere: [],
            //对defaultWhere的操作
            addWhere: function (key, value, pattern) {
                if (key && value) {
                    switch (pattern) {
                        case "":
                        case undefined:
                        case "=":
                            pattern = "equal";
                            break;
                        case ">":
                            pattern = "greater";
                            break;
                        case ">=":
                            pattern = "greaterequal";
                            break;
                        case "<":
                            pattern = "less";
                            break;
                        case "<=":
                            pattern = "lessEqual";
                            break;
                        case "<>":
                            pattern = "notequal";
                            break;
                    }
                    this.defaultWhere.push({ "paramName": key, "paramValue": value, "paramPattern": pattern });
                }
            }
        };
        this.$target = null;
        //设置添加按钮打开的链接
        //this.addLink = null;
        //设置添加按钮打开窗口标题
        //this.addTitle = null;
        //获取列表的选中项，返回ID数组
        this.getChecked = function () {
            if (this.$target == null) {
                return [];
            }
            var selRows = this.$target.datagrid("getChecked");
            return selRows;
        };
        this.getCheckedId = function () {
            if (this.$target == null) {
                return [];
            }
            var selRows = this.$target.datagrid("getChecked");
            var ids = new Array();
            for (var i = 0; i < selRows.length; i++) {
                var id = selRows[i][this.Internal.primarykey];
                ids.push("'" + id + "'");
            }
            return ids;
        };
        this.getSelected = function () {
            if (this.$target == null) {
                return [];
            }
            return this.$target.datagrid("getSelected");
        }
        this.getData = function () {
            if (this.$target == null) {
                return [];
            }
            return this.$target.datagrid("getData");
        }
        this.reload = function () {
            if (this.$target == null) {
                return;
            }
            this.$target.datagrid("reload");
        }
        /**
        *主键列对象，可对按钮进行操作
        */
        this.PKColumn = new PKColumn(this);
        this.Search = new $Core.Common._Internal.Search();
        this.ToolBar = new $Core.Common._Internal.ToolBar();
    };
    DataGrid.prototype.bind = function () {
        //如果是编辑模式
        if (this.isEditor) {
            var that = this;
            var dbClick = this.options.onDblClickRow;
            this.options.onDblClickRow = function (rowIndex, rowData) {
                if (dbClick && dbClick(rowIndex, rowData) == false) {
                    return;
                }
                _edit_dbClick(rowIndex, rowData, that);
            }
            var click = this.options.onClickRow;
            this.options.onClickRow = function (rowIndex, rowData) {
                if (click && click(rowIndex, rowData) == false) {
                    return;
                }
                _edit_click(rowIndex, rowData, that);
            }
        }
        var dg = this;
        var interval;
        $Core.Utility.Ajax.post("GetHeader", dg.viewName, dg.options.queryParams, null, null,
            function (result) {
                dg.Internal.headerData = result;
                interval = setInterval(function () { _bindGrid(dg, interval); }, 5);
            }
        );
    }
    function _bindGrid(dg, interval) {
        if ($Core.Global.Variable.isLoadCompleted) {
            clearInterval(interval);
            _init.call(dg);
            if (dg.isShowToolArea) {
                if (!dg.Search.isHidden) {
                    $Core.Common._Internal.registerEvent(dg);
                }
                if (!dg.ToolBar.isHidden) {
                    bindToolbar.call(dg);
                }
            }
            $Core.Global.DG.Items.set(dg.Internal.id, dg);
        }
    }
    function _init() {
        var dg = this;
        var objColumns = $Core.Common.Formatter.formatHeader(dg);
        if (!objColumns) {
            return false;
        }
        var opts = dg.options;
        var costomToolbar = false;
        if (opts && opts.toolbar) {
            costomToolbar = true;
        }
        var beforeLoad = opts.onBeforeLoad;
        var loadSuccess = opts.onLoadSuccess;
        var cfg = {
            toolbar: "#" + dg.Internal.toolbarID,
            loadMsg: "Loading...",
            idField: dg.Internal.primarykey,
            striped: true,
            nowwrap: false,
            singleSelect: true,
            checkOnSelect: false,
            selectOnCheck: false,
            border: true,
            frozenColumns: [objColumns.frozen],
            columns: objColumns.cols,
            pageSize: 15,
            pageList: [10, 15, 20, 30, 40, 50, 100],
            fit: true,
            fitColumns: false,
            pagination: true,
            rownumbers: true,
            autoRowHeight: false,
            queryParams: {},
            onBeforeLoad: function (param) {
                var mid = function () {
                    var topWin = window;
                    return function (win) {
                        var ar = win.AR;
                        if (ar.Global.Variable.mid && win != topWin) {
                            return ar.Global.Variable.mid;
                        }
                        if (win == win.top) {
                            return null;
                        }
                        return arguments.callee(win.parent.window);
                    }(topWin);
                }();
                if (mid) { param.sys_mid = mid; };
                beforeLoad && beforeLoad(param);
            },
            onLoadSuccess: function () {
                beforeLoad && onLoadSuccess(param);
            },
            onHeaderContextMenu: function (e, field) {
                var actionKeys = $Core.Global.Variable.actionKeys;
                if (actionKeys && actionKeys.indexOf('config') != -1) {
                    e.preventDefault();
                    if (!dg.cmenu) {
                        _createColumnMenu(dg);
                    }
                    dg.cmenu.menu('show', {
                        left: e.pageX,
                        top: e.pageY
                    });
                }

            }
        };
        
        if (costomToolbar == false && dg.isShowToolArea != false) {
            $Core.Common._Internal.createSearchForm(dg); //内部有判断，创建SearchForm表单
            if (!dg.ToolBar.isHidden) {
                $Core.Combobox.onInit();
            }
            if (!dg.ToolBar.isHidden) {
                _setToolbar.call(dg, dg.ToolBar._btnArray);//自定义的按钮。
            }
        }
        opts = opts || {};
        var searchJson = [];
        if (dg.Search && dg.Search.$target) {
            var tForm = dg.Search.$target.parents('form');
            searchJson = $Core.Common._Internal.buildSearchJson(tForm);
        }
        if (opts.defaultWhere && opts.defaultWhere.length > 0) {
            searchJson = searchJson.concat(opts.defaultWhere);
        }
        if (searchJson.length > 0) {
            cfg.queryParams['sys_search'] = JSON.stringify(searchJson);
        }

        var options = $.extend(cfg, opts);
        //请求URL地址设置
        options.url = (opts.url || $Core.Utility.Ajax.Settings.url) + "?sys_method=GetList&sys_objName=" + dg.viewName + "&sys_tableName=" + dg.tableName;

        dg.$target = $("#" + dg.Internal.id).datagrid(options);

        if (options.pagination) {
            //初始化分页控件
            var pagination = dg.$target.datagrid('getPager');
            $(pagination).pagination({
                beforePageText: '第', //页数文本框前显示的汉字  
                afterPageText: '页    共 {pages} 页',
                displayMsg: '当前显示 {from} - {to} 条记录   共 {total} 条记录'
            });
        }
        $(".datagrid-cell-group").css({ fontWeight: 'bold' }); //设置合并列的加粗样式
    }
    function _createColumnMenu(dg) {
        dg.cmenu = $('<div/>').appendTo('body');
        dg.cmenu.menu({
            onClick: function (item) {
                var url = $Core.Utility.stringFormat("{0}?viewName={1}", $Core.Global.Variable.ui + '/Web/SysAdmin/config.html', dg.viewName);
                $Core.Utility.Window.open(url, "", false);
            }
        });
        dg.cmenu.menu('appendItem', {
            text: "配置",
            name: "配置"
        });
    }
    function _getBtnTemp(key) {
        var btn = $Core.PKTemplate[key];
        if (btn == undefined) {
            return '<span  title="' + key + '"   op="0">' + key + '</span>';
        }
        return btn;
    }
    /*
    （注）-edit按钮的url对应添加按钮的窗口连接路径 
    示例:[{ btn: 'edit', url: 'UserView.html',winTitle:"编辑用户",lv2action:'actionname' }, { btn: 'del' }],
    lv2action属性不写默认无权限控制
    如需重写打开窗体事件，在调用页面新增 openPage,或者删除行事件delRow 
    edit  编辑
    ，del  删除  
    ，detail   详情
    ，picture  图片
    ，download     下载
    ，diary    日志
    ，map      地图
    ，progress     进度
    ，reviewed     审核通过
    ，reviewing    审核中
    ，save     保存
    */
    function _setButtons(btnItems) {
        var dg = this;
        if (!(btnItems instanceof Array)) {
            throw TypeError("参数不是数组对象");
        };
        var actionKeys = $Core.Global.Variable.actionKeys;
        each1: for (var i = 0; i < btnItems.length; i++) {
            var key = btnItems[i]['btn']
            , url = btnItems[i]['url']
            , title = btnItems[i]['title']
            , winTitle = btnItems[i]['winTitle']
            , btn = $(_getBtnTemp(key))[0]//
            , lv2action = btnItems[i]['lv2action'] && btnItems[i]['lv2action'].toLowerCase()
            , click = btnItems[i]['click'];
            //设置添加按钮的连接
            if (key == 'edit') {
                dg.ToolBar.BtnAdd.winUrl = url;
                dg.ToolBar.BtnAdd.winTitle = (winTitle || "").replace('编辑', '新增');
            }
            url && btn.setAttribute("url", url);
            winTitle && btn.setAttribute("winTitle", winTitle);
            title && btn.setAttribute("title", title);
            click && btn.setAttribute("click", click);
            if ((actionKeys && actionKeys.indexOf(lv2action) != -1) || !lv2action) {
                dg.Row.Default._btnArray.push(btn);
            }
        };
    }
    //该函数有问题，如果权限没有某个按钮，顺序错位导致find不到控件，导致无法插入，请修正。
    function _setToolbar(btnArray) {
        if (!(btnArray instanceof Array)) {
            throw TypeError('参数必须是一个数组');
        }
        var hiddenCount = 0;
        var actionKeys = $Core.Global.Variable.actionKeys;
        for (var i = 0, len = btnArray.length; i < len; i++) {
            if (btnArray[i] == undefined) { continue; }
            var lv2action = btnArray[i].lv2action && btnArray[i].lv2action.toLowerCase();
            if (!lv2action || actionKeys.indexOf(',' + lv2action + ",") > -1) {
                var index = btnArray[i].index;
                var btn = btnArray[i].btn,
                    item = '';
                if (btn.html) {
                    item = btn.html;
                } else {
                    var btnClass = btn.css || "btn-sm";
                    var btnClick = btn.click;
                    var title = btn.title;
                    item = $Core.Utility.stringFormat('<a><input class=\"{0}\" type=\"button\" onClick=\"{1}(event)\"  value=\"{2}\"/></a>', btnClass, btnClick, title);
                }
                item = $(item);
                var toolbarContainer = $("#" + this.Internal.toolbarID).find(".function-box"),
                    count = toolbarContainer.children().length;
                if (count == 0) {
                    toolbarContainer.append(item);
                } else {
                    if (count < index) {
                        index = count;
                        toolbarContainer.children().eq(index - 1).after(item);
                    } else {
                        toolbarContainer.children().eq(index - 1).before(item);
                    }
                }
                dg.ToolBar.Items.set(lv2action || title || btnClick, { "isCustom": true, $target: item });
            }
        }
    }
    function bindToolbar() {
        var dg = this;
        var toolbar = $("#" + dg.Internal.toolbarID);
        if (!toolbar[0]) {
            //throw new ReferenceError("工具条的ID无效,页面未找到该ID值的HTML标签");
            return;
        }
        toolbar.delegate("[flag = 'btn_add']", "click", function () {
            dg.ToolBar.BtnAdd.onExecute(dg);
        });
        if (!dg.isShowCheckBox) {
            toolbar.find(".batch_del").hide();
        }
        toolbar.delegate("[flag = 'btn_del']", "click", function () {
            dg.ToolBar.BtnDelBatch.onExecute(dg);
        });
        //导出

        toolbar.delegate("[flag = 'btn_export']", "click", function () {
            dg.ToolBar.BtnExport.onExecute(dg);
        });
        //导出模板
        toolbar.delegate("[flag = 'btn_export_template']", "click", function () {
            dg.ToolBar.BtnExportTemplate.onExecute(dg);
        });

        //查询按钮
        toolbar.delegate("[flag = 'btn_query']", "click", function () {
            $(this).parent().parent().siblings("[sign='div_searchArea']").toggle();
        });
        //配置表头按钮事件
        //toolbar.delegate("[flag = 'btn_config']", "click", function () {
        //    var viewName = dg.viewName;
        //    alert(1);
        //    $Core.Utility.Window.open($Core.route.gridconfig + "?viewName=" + viewName, "", false);
        //});


        //导入按钮事件
        (function () {
            try {
                //如果找不到控件ID不加载下面代码
                if (!toolbar.find("[flag = 'btn_import']")[0]) {
                    return;
                }
                var id = "btn_import" + Math.floor(Math.random() * 10000);
                toolbar.find("[flag = 'btn_import']").attr("id", id);
                var exts = ["xls", "xlsx"];
                var url = $Core.Utility.stringFormat($Core.route.root + '?sys_method=Import&sys_objName={0}&sys_tableName={1}&sys_mid={2}', dg.viewName, dg.tableName, $Core.Global.Variable.mid);
                $Core.Utility.initUploadButton(url, id, "excelImport", exts,
                function (file, ext) {
                    if ($Core.Utility.isInArray(exts, ext)) {
                        $.messager.progress({
                            title: "消息提示",
                            msg: "正在导入数据，请稍候..."
                        });
                    }
                    else {
                        $Core.Utility.Window.showMsg('上传文件扩展名必须是已下格式<br/>' + exts);
                        return false;
                    }
                    var param = {};
                    var result = dg.ToolBar.BtnImport.onBeforeExecute(param);
                    if (result == false) {
                        return false;
                    }
                    this.setData(param);
                },
                function (original_filename, data) {
                    //file 是文件名,data 是返回的东西
                    $.messager.progress('close');
                    data = JSON.parse(data);
                    if (data.success) {
                        $Core.Utility.Window.showMsg(data.msg);
                        dg.$target.datagrid("reload");
                    }
                    else {
                        data.msg = data.msg.replace(/&/g, '&amp').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace("\"", "'");
                        var tip = "<div>数据异常，导入失败！<a title=\"" + data.msg + "\" onclick=\"javascript:alert(this.title)\"><font color='red'>查看错误详情</font></a></div>";
                        $Core.Utility.Window.showMsg(tip, null, null, 8000);//"导入失败！"
                        if (data.sys_down != undefined) {
                            $Core.Utility.download('Down', { 'sys_down': data.sys_down });
                        }

                    }
                    dg.ToolBar.BtnImport.onAfterExecute(data);
                });
            } catch (e) {
                throw new Error("导入控件注册失败,请引入$Core.Utility.js文件");
            }
        }())

    }
    function PKColumn(dg) {
        $Core.BtnBase.call(this);
        //存档每行的主键列信息，只能在数据呈现之后获取,如onLoadSuccess事件
        this.Items = new $Core.Dictionary();
        this._btnArray = new Array();
        /**
        *如果设置clickname url&winTitle则无效
        *@param{string} key 指向$Core.Common.js文件buttons_temp对象中的key值
        *@param{string} title 鼠标划过显示的文字
        *@param{string} clickname 事件名
        *@param{string} url 打开页面的URL
        *@param{string} winTitle 打开窗口的标题
        *@param{string} lv2action 二级权限名称
        */
        this.add = function (key, title, clickname, url, winTitle, lv2action) {
            var btn = $(_getBtnTemp(key))[0];
            //设置添加按钮的连接
            if (key == 'edit') {
                dg.ToolBar.BtnAdd.winUrl = url;
                dg.ToolBar.BtnAdd.winTitle = (winTitle || "").replace('编辑', '新增');
            }
            url && btn.setAttribute("url", url);
            winTitle && btn.setAttribute("winTitle", winTitle);
            title && btn.setAttribute("title", title);
            clickname && btn.setAttribute("click", clickname);
            btn.key = key;
            btn.lv2action = lv2action;
            var actionKeys = $Core.Global.Variable.actionKeys;
            if ((actionKeys && actionKeys.indexOf(lv2action) != -1) || !lv2action) {
                this._btnArray.push(btn);
            }
        };
        /**
        *可以条件过滤按钮的显示,此方法不能直接调用，需要重写过滤。
        *该方法在onBeforeExecute之前被调用。
        *@param{value,row,index} 这些参数是代表：{值、行数据、当前行索引}
        *@param{Array} 可遍历数组，对集合对象的条件进行过滤。,数组保存是按钮的DOM对象既HTML全文本
        *@return{Array}
        */
        this.onFilter = function (value, row, index, btnArray) {
            return btnArray;
        };
        //打开业务页面
        this._onOpen = function (el, value, thatID, index) {
            var dg = $Core.Global.DG.operating = $Core.Global.DG.Items[thatID]; //赋值当前对象到page属性方便调用
            var $aTarget = $(el);
            var op = $aTarget.attr("op");
            var splitIndex = location.href.indexOf('List') == -1 ? location.href.indexOf('.') : location.href.indexOf('List');
            var url = $aTarget.attr("url") || dg.ToolBar.BtnAdd.winUrl || location.href.substring(location.href.lastIndexOf('/') + 1, splitIndex) + 'Edit.html';
            var winTitle = $aTarget.attr("winTitle");
            var _fn = $aTarget.attr("click");
            try {
                _fn = eval(_fn);
            } catch (e) {
                _fn = undefined;
            }
            if (_fn && typeof (_fn) == "function") {
                dg.$target.datagrid('selectRecord', value);
                var row = dg.getSelected();
                _fn(value, row, index, el);
            } else {
                url = url.indexOf("?") == -1 ? url + "?id=" + value : url + "&id=" + value;
                var _match = url.match(/\{([\S\s]*?)\}/g);//匹配自定义标签
                if (_match) // add by cyq 2016-08-17
                {
                    var _row = dg.getSelected();//获取行数据
                    for (var i = 0; i < _match.length; i++) {
                        var _matchValue = _match[i];
                        var _key = _matchValue.substring(1, _matchValue.length - 1);
                        var _value = _row[_key];
                        if (_value) {
                            url = url.replace(_matchValue, _value);
                        }
                    }
                }
                $Core.Utility.Window.open(url, (winTitle || " "), op == 1);
            }

        };
        this._onDel = function (el, value, dgID, index) {
            var dg = $Core.Global.DG.Items[dgID];
            var ids = new Array();
            if (value) {
                dg.$target.datagrid("selectRecord", value);
                var row = dg.$target.datagrid("getSelected");
                ids.push(value);//"'" + id + "'"
            }
            else {
                var selRows = dg.getCheckedId();
                if (selRows.length == 0) {
                    $Core.Utility.Window.showMsg("请选择要删除的数据!");
                    return false;
                }
                ids = selRows;
            }
            if (el && el.onBeforeExecute(ids, index) == false) {
                return false;
            }

            $Core.Utility.Window.confirm('确认删除操作吗？', null, function () {
                $Core.Utility.Ajax.post("Delete", dg.tableName, { "id": ids.join(',') }, false, null, function (responseData) {
                    if (el && el.onAfterExecute(responseData, ids, index) == false) {
                        return;
                    }
                    if (responseData.success != undefined && responseData.success) {
                        $Core.Utility.Window.showMsg("删除成功");
                        dg.reload();
                    } else {
                        $Core.Utility.Window.showMsg("删除失败！错误消息：" + responseData.msg);
                        dg.reload();
                    }
                });
            });

        };

        this.Editor = function () {
            var Obj = new Object();
            Obj.editIndex = null;
            this.operator = null;
            /*属性标识保存数据是否实时更新*/
            Obj.isSaveToBehind = true;
            /*是否插入行数据*/
            Obj.isInsertRow = false;
            Obj.insertRowData = {};
            Obj.BtnEdit = (function () {
                function Obj() {
                    $Core.BtnBase.call(this);
                    this.hidden = false;
                    this.onBeforeExecute = function (dg, value, index) { };
                    this.onExecute = function (dg, value, index) {
                        dg.$target.datagrid("selectRecord", value);
                        var row = dg.$target.datagrid("getSelected");
                        var index = dg.$target.datagrid("getRowIndex", row);
                        //把行设置为编辑状态,操作符设置为更新状态,设置为新增状态在添加按钮事件时触发
                        if (dg.PKColumn.Editor.operator == "Add" && dg.$target.datagrid("getEditors", index).length > 0) {
                            return;
                        }
                        if (this.onBeforeExecute(dg, value, index) == false) {
                            return;
                        }
                        if (endEditing(dg)) {
                            _beginEditing(index, row, dg);
                            //dg.PKColumn.Editor.editIndex = index;
                            //dg.$target.datagrid('refreshRow', index);
                            //dg.$target.datagrid('selectRow', index).datagrid('beginEdit', index);
                            //dg.PKColumn.Editor.operator = "Update";
                            dg.$target.datagrid("getEditor", { index: index, field: dg.Internal.primarykey }).target.attr('disabled', 'disabled');
                        }
                    };
                    this.onAfterExecute = function () { };
                }
                return new Obj();
            })();
            Obj.BtnDel = (function () {
                function Obj() {
                    $Core.BtnBase.call(this);
                    this.hidden = false;
                    this.onBeforeExecute = function (value, index) { };
                    this.onExecute = function (dg, value, index) {
                        if (endEditing(dg)) {
                            dg.$target.datagrid("selectRecord", value);
                            var row = dg.$target.datagrid("getSelected");
                            var index = dg.$target.datagrid("getRowIndex", row);
                            if (index == -1) { return; };
                            if (dg.PKColumn.Editor.BtnDel.onBeforeExecute(value, index) == false) {
                                return;
                            }
                            dg.$target.datagrid("selectRow", index);
                            if (dg.isEditor && dg.$target.datagrid("getSelected")[dg.Internal.primarykey]) {
                                $Core.Utility.Window.confirm("确定删除此条信息吗？", null, function () {
                                    var result = $Core.Utility.Ajax.post("Delete", dg.tableName, { id: value }, false, dg.options.url || $Core.route.root);
                                    if (result.success) {
                                        dg.$target.datagrid('deleteRow', index);
                                        dg.$target.datagrid('acceptChanges');
                                    }
                                    $Core.Utility.Window.showMsg(result.msg);
                                    dg.PKColumn.Editor.BtnDel.onAfterExecute(dg, value, index);
                                });
                            } else {
                                dg.$target.datagrid('deleteRow', index);
                                dg.$target.datagrid('acceptChanges');
                                dg.PKColumn.Editor.editIndex = null;
                                dg.PKColumn.Editor.operator = null;
                            }
                        }
                    };
                    this.onAfterExecute = function (value, index) { };
                }
                return new Obj();
            })();
            Obj.BtnSave = (function () {
                function Obj() {
                    $Core.BtnBase.call(this);
                    this.hidden = false;
                    /**
                    *保存数据前的处理拦截
                    *@param{post_data} 传入后台的数据，包含行内所有数据，可操作post_data对象附加数据
                    */
                    this.onBeforePost = function (post_data) { };
                    this.onBeforeExecute = function (dg, value, index) { };
                    this.onExecute = function (dg, value, index) {
                        dg.$target.datagrid("selectRecord", value);
                        var row = dg.$target.datagrid("getSelected");
                        var index = dg.$target.datagrid("getRowIndex", row);
                        //如果编辑状态则保存数据操作，如果新增状态，则插入数据的操作
                        if (index != dg.PKColumn.Editor.editIndex) {
                            return false;
                        }
                        if (this.onBeforeExecute(dg, value, index) == false) {
                            return;
                        }
                        _editSave(dg, index);
                        dg.PKColumn.Editor.editIndex = null;
                        dg.$target.datagrid('refreshRow', index);

                    };
                    this.onAfterExecute = function () { };
                }
                return new Obj();
            })();
            Obj.BtnCancel = function () {
                function Obj() {
                    $Core.BtnBase.call(this);
                    this.hidden = false;
                    this.onBeforeExecute = function () { };
                    this.onExecute = function (dg, value, index) {
                        dg.$target.datagrid("selectRecord", value);
                        var row = dg.$target.datagrid("getSelected");
                        var index = dg.$target.datagrid("getRowIndex", row);
                        if (this.onBeforeExecute(dg, value, index) == false) {
                            return;
                        }
                        dg.PKColumn.Editor.editIndex = null;//下面的会变更状态。
                        if (dg.$target.datagrid("getEditors", index).length > 0) {
                            //如果编辑状态则取消操作，删除状态则删除行
                            if (dg.PKColumn.Editor.operator == "Add" || dg.operator == "Add") {
                                dg.$target.datagrid('deleteRow', index);
                            } else {
                                dg.$target.datagrid('cancelEdit', index);
                            }
                        }
                        else { dg.$target.datagrid('refreshRow', index); }
                    };
                    this.onAfterExecute = function () { };
                }
                return new Obj();
            }();
            return Obj;

        }();
    }
    function _edit_click(rowIndex, rowData, dg) {
        if (dg.PKColumn.Editor.editIndex == null || dg.PKColumn.Editor.editIndex == rowIndex) {
            return false;
        }
        var editIndex = dg.PKColumn.Editor.editIndex;
        if (dg.$target.datagrid('validateRow', editIndex)) {
            var result = _editSave(dg, editIndex, true);
            if (result) {
                dg.PKColumn.Editor.editIndex = null;
                dg.$target.datagrid('refreshRow', editIndex);
                _beginEditing(rowIndex, rowData, dg);
            }
        }
        endEditing(dg);
    }
    function _edit_dbClick(rowIndex, rowData, dg) {
        if (dg.PKColumn.Editor.editIndex == null || dg.PKColumn.Editor.editIndex == rowIndex) {
            _beginEditing(rowIndex, rowData, dg);
            return false;
        }
        var editIndex = dg.PKColumn.Editor.editIndex;
        if (dg.$target.datagrid('validateRow', editIndex)) {
            var result = _editSave(dg, editIndex, true);
            if (result) {
                dg.PKColumn.Editor.editIndex = null;
                dg.$target.datagrid('refreshRow', editIndex);
                _beginEditing(rowIndex, rowData, dg);
            }
        }
        if (endEditing(dg)) {
            _beginEditing(rowIndex, rowData, dg);
        }
    }
    //作用就是把已经打开的编辑状态给关闭。
    function endEditing(dg) {
        if (dg.PKColumn.Editor.editIndex == null) { return true; }
        var rowIndex = dg.PKColumn.Editor.editIndex;
        if (dg.$target.datagrid('validateRow', rowIndex)) {
            dg.PKColumn.Editor.editIndex = null;
            dg.$target.datagrid('endEdit', rowIndex);
            dg.$target.datagrid('refreshRow', rowIndex);
            //dg.$target.datagrid("rejectChanges");
            return true;
        } else {
            //dg.$target.datagrid('cancelEdit', index);
            return false;
        }
    }
    function _beginEditing(index, row, dg) {
        dg.PKColumn.Editor.editIndex = index;
        dg.$target.datagrid('refreshRow', index);
        dg.PKColumn.Editor.operator = 'Update';
        dg.$target.datagrid('selectRow', index).datagrid('beginEdit', index);
        dg.options.onEditing && dg.options.onEditing(index, row);
    }
    function getRowParams(dg, value) {
        dg.$target.datagrid("selectRecord", value);
        var row = dg.$target.datagrid("getSelected");
        var index = dg.$target.datagrid("getRowIndex", row);
        return [index, row];
    }
    function _editSave(dg, currentIndex, dbclick) {
        var editResult = false;
        var editor = dg.$target.datagrid("getEditors", currentIndex);
        if (editor.length > 0 && dg.$target.datagrid('validateRow', currentIndex)) {
            var row = null;
            if (dbclick) {
                row = $.extend(true, {}, $.data(dg.$target[0], "datagrid").data.rows[dg.PKColumn.Editor.editIndex]);
            } else { row = $.extend(true, {}, dg.getSelected()); }
            if (row) {
                var _type = (dg.PKColumn.Editor.operator == "Update") ? 'updated' : 'inserted';
                dg.$target.datagrid("endEdit", currentIndex); //结束编辑行
                var _change_data = dg.$target.datagrid("getChanges", _type)[0]; //获取行数据
                if (_change_data) {
                    if (dg.PKColumn.Editor.isSaveToBehind == false) {
                        // dg.PKColumn.Editor.editIndex = null;
                        dg.$target.datagrid("acceptChanges");
                    } else {
                        var post_data = {};
                        if (_type == 'inserted' && dg.PKColumn.Editor.insertRowData) {
                            post_data = _change_data;
                        } else {
                            post_data = getChangeJson(_change_data, row, dg);
                        }
                        if ($.isEmptyObject(post_data)) { dg.$target.datagrid('cancelEdit', currentIndex); return false; };
                        row[dg.Internal.primarykey] && (post_data[dg.Internal.primarykey] = row[dg.Internal.primarykey]);//附加主键的ID值传入后台                                
                        if (dg.PKColumn.Editor.BtnSave.onBeforePost && $.isFunction(dg.PKColumn.Editor.BtnSave.onBeforePost)) {
                            dg.PKColumn.Editor.BtnSave.onBeforePost(post_data);
                        }
                        var result = $Core.Utility.Ajax.post(dg.PKColumn.Editor.operator, dg.tableName, post_data, false, dg.options.url || $Core.route.root);
                        if (result.success) {
                            if (dg.PKColumn.Editor.operator == "Add") {
                                _change_data[dg.Internal.primarykey] = result.msg;//这里才是将ID写回去的地方。
                                result.msg = "添加成功";
                            }
                            //dg.PKColumn.Editor.editIndex = null;
                            dg.$target.datagrid("acceptChanges");
                            dg.PKColumn.Editor.BtnSave.onAfterExecute();
                            editResult = true;
                        } else {
                            //dg.PKColumn.Editor.editIndex = null;
                            dg.$target.datagrid('cancelEdit', currentIndex);
                        }
                        dg.PKColumn.Editor.operator = undefined;
                        $Core.Utility.Window.showMsg(result.msg);
                    }
                }
            }
        }
        return editResult;
    }

    //用于检测值是否被修改了，如果修改了，只提取出修改过的值。
    function getChangeJson(newJson, oldJson, dg) {
        var changeJson = {};
        var count = 0;
        if (oldJson && oldJson[dg.Internal.primarykey] == newJson[dg.Internal.primarykey]) {
            for (var item in newJson) {
                if ((oldJson[item] == undefined && newJson[item].toString() != "") ||
                    oldJson[item] != undefined && oldJson[item].toString() != newJson[item].toString()) {
                    changeJson[item] = newJson[item];
                    count++;
                }
            }
        }
        return changeJson;
    }
}(jQuery, AR);



