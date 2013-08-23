// Constants per account
var EPSILON = 0.000001;
var pairsList = [];
var activeAccountId;
var accSummaryFields;
var $tradeForm;
var pairsSelectedList = [ 'EUR_USD', 'USD_CAD', 'AUD_USD', 'GBP_USD', 'EUR_JPY', 'USD_JPY' ]
var openTradePairs = [];
var openOrderPairs = [];
var $pairsSelected;
var $pairsNotSelected;
var $ratesList;
var $rateTemplate;
var $listType;
var $txList;
var $tradeTemplate;
var $orderTemplate;
var $positionTemplate;
var $transactionTemplate;
var openTradeFields;
var openOrderFields;
var openPositionFields;
var openTransactionFields;
var refreshTime = 250;
var GREEN = 'rgb(0,220,0)';
var FADEDGREEN = 'rgb(180,250,180)';
var RED = 'rgb(255,0,0)';
var FADEDRED = 'rgb(250,180,180)';
var millisecondsInAnHour = 360000;

// Misc
jQuery.fn.highlight = function(color) {
    this.stop();
    this.animate({color:color}, 300).delay(500).animate({color:'#000'}, 500);
}

jQuery.fn.highlightBg = function(color) {
    this.stop();
    this.animate({backgroundColor:color}, 400).animate({backgroundColor:'#fff'}, 400);
}

function priceIncrease(oldPrice, newPrice) {
    return ((newPrice - oldPrice) > EPSILON)
}

function resizeSidesContent($lSide, $rSide) {
    var lWidth = $lSide.width();
    var rWidth = $rSide.width();
    
    if ($('#trades #txListContainer').length != 0) {
        $('#trades .btn-group .btn').width((rWidth-5)/4);
    }
    
    $tradeForm.find('.btn.txType').width((lWidth-2)/2);
}

function windowResize() {    
    var $left = $('#leftSide');
    var $trades = $('#trades');
    resizeSidesContent($left, $trades);
    $(window).bind('resize',function() {
        resizeSidesContent($left, $trades);
    });
}

function getExpiryFromHours(hours) {
    var expiry = new Date();
    expiry.setTime(expiry.getTime() + (hours * millisecondsInAnHour));
    return expiry.toISOString();
}

function alertResponse(response, type) {
    if (response['error']) {
        alert(response['error'].message);
    } else {
        if (type == 'trade') {
            getTradeList();
        } else {
            getOrderList();
        }
        
        alert('A trade or order has been created!');
    }
}

function convertToInput($span) {
    var value = $span.html();
    var param = $span.attr('class').split(' ');
        
    return $span.html('').append('<input type="text" class="'+param[0]+'" value="'+value+'" />').find('.'+param).unwrap().focus();
}

function convertToSpan($input) {
    var value = $input.val();
    var param = $input.attr('class');
    
    return $input.wrap('<span class="'+param+'"></span>').parent().html(value);    
}

function checkForSpanChange($span, value) {
    if ($span.html() != value) {
        $span.addClass('changed');
    }
}

// Account functions
function startAccount() {
    getAccountInfo();
    updateAccountInfo();
}

function getDisplayedAccountFields($table) {
    var fieldsList = {};
    
    $table.find("*[id]").each(function(i, obj) {
        fieldsList[obj.id] = obj;
    }); 
    
    return fieldsList;
}

function updateAccountInfo() {
    return setInterval(function() {
        if (activeAccountId != '') {
            getAccountInfo();
        }
    }, refreshTime);
}

function changePLColor(pl) {
    if (pl.innerHTML.indexOf('-') == -1) {
        pl.style.color = GREEN;
    } else {
        pl.style.color = RED;
    }
}

// Trading form functions
function enableOpenTxSideAndType() {
    $('.order-param').hide();
    $('#transactionSide div').bind('click',function() {
        setTxSide(this);
    });
    $('#transactionType div').bind('click',function() {
        setTxType(this);
    });
}

function printPairForTrade($selector, pair) {
    $selector.append('<option value="'+pair.instrument+'">'+pair.displayName+'</option>');
}

function toggleOrderParams(txType) {
    if (txType == 'order') {
        $('.order-param').fadeIn();
    } else {        
        $('.order-param').fadeOut();
    }        
}

function setTxType(typeBtn) {
    var type = typeBtn.innerHTML.toLowerCase();
    
    $('input[name=transaction_type]').val(type);    
    $(typeBtn).parent().find('.active').attr('class','btn txType');
    typeBtn.className += ' active btn-info';
    
    toggleOrderParams(type);
}

function setTxSide(sideBtn) {
    var side = sideBtn.innerHTML.toLowerCase();

    $('input[name=side]').val(side);
    $(sideBtn).parent().find('.active').attr('class','btn');
    if (side == 'buy') {
        sideBtn.className += ' active btn-success';
    } else {
        sideBtn.className += ' active btn-danger';
    }
}

function fillField(k, v) {
    if (k == 'instrument') {
        $tradeForm.find('#pairSelector').find('option[value='+v+']').prop('selected',true);
    } else if (k == 'side') {
        $('#transactionSide div:contains("'+v.substr(0,1).toUpperCase()+v.substr(1)+'")').click();
    } else {
        $tradeForm.find('input[name='+k+']').val(v);
    }
}

function fillTradeForm(params) {    
    $.each(params, function(i, obj) {
        fillField(i, obj);
    });
}

function tradeAction(form) {
    var data = {}, opt = {};
    var allowedOptParams = [ 'takeProfit', 'stopLoss', 'trailingStop', 'lowerBound', 'upperBound' ]
    
    $.each($(form).serializeArray(), function(i, obj) {
        if (allowedOptParams.indexOf(obj.name) != -1) {
            if (obj.value != '') {
                opt[obj.name] = obj.value;
            }
        } else {
            data[obj.name] = obj.value;
        }
    });
    data['opt'] = opt;

    if (data['transaction_type'] == 'trade') {
        createTrade(data);
    } else if (data['transaction_type'] == 'order') {
        createOrder(data);
    } else if (data['transaction_type'] == 'transactions') {
    
    } else if (data['transaction_type'] == 'positions') {
    
    }
}

// Rates List functions
// refactor this at some point
function startRates() {
    setTimeout(function() {updatePairsFromAll()}, refreshTime);
    getRates();
    runRates = updateRates();
}

function printPairToSelect(obj) {
    $pairsNotSelected.append('<option value="'+obj.instrument+'">'+obj.displayName+'</options>');
    $('#chartInstrumentSelector').append('<option value="'+obj.instrument+'">'+obj.displayName+'</options>');
}

function moveSelectedPairs(list, $dest) {
    $.each(list, function() {
        $(this).prop('selected',false).appendTo($dest);
    });
}

function addPairsFromOpenTx() {
    if ($txList.children().length > 0) {
        if (getListType() == 'trades') {
            $txList.find('.openTrade .instrument').each(function() {
                var instr = this.innerHTML.replace('/','_');
                if (openTradePairs.indexOf(instr) == -1) {
                    openTradePairs.push(instr);
                    addPairsFrom(openTradePairs);
                }
            });
        } else if (getListType() == 'orders') {
            $txList.find('.openOrder .instrument').each(function() {
                var instr = this.innerHTML.replace('/','_');
                if (openOrderPairs.indexOf(instr) == -1) {
                    openOrderPairs.push(instr);
                    addPairsFrom(openOrderPairs);
                }
            });
        }
    }
}

function checkListForPair(list) {
    $.each($pairsSelected.find('option'), function(i, obj) {
        if (list.indexOf(obj.value) == -1) {
            moveSelectedPairs($(obj), $pairsNotSelected);
        }
    });
}

function removePairFromOpenTx(pair, list) {
    var index = list.indexOf(pair);
    
    if (index != -1) {
        list.splice(index);
    }
    
    checkListForPair(pairsSelectedList.concat(openTradePairs).concat(openOrderPairs));
}

function addPairsFrom(list) {
    $.each(list, function(i, value) {
        moveSelectedPairs($pairsNotSelected.find('option[value="'+value+'"]'), $pairsSelected);
    });
}

function updatePairsFromAll() {
    addPairsFrom(pairsSelectedList);
    addPairsFrom(openTradePairs);
    addPairsFrom(openOrderPairs);
}

function addPair() {
    moveSelectedPairs($pairsNotSelected.find('option:selected'), $pairsSelected);
}

function removePair() {
    moveSelectedPairs($pairsSelected.find('option:selected'), $pairsNotSelected);
}

function addAllPairs() {
    moveSelectedPairs($pairsNotSelected.find('*'), $pairsSelected);
}

function removeAllPairs() {
    moveSelectedPairs($pairsSelected.find('*'), $pairsNotSelected);
}

function removePairDiv(pairsList) {
    $ratesList.find('.pair-rate').each(function() {
        if (pairsList.indexOf(this.id) == -1) {
            this.remove();
        }
    });
}

function updateSelectedPairsList() {
    $('#close').click();
    pairsSelectedList = [];
    
    $pairsSelected.find('option').each(function(i, obj) {
        pairsSelectedList.push(obj.getAttribute('value'));
    });
    
    window.location.href = '#';

    updatePairsFromAll();
}

function fillBuy() {
    $('.ask').unbind('click').bind('click', function() {
        fillTradeForm({"side":"buy","instrument":$(this).closest('.pair-rate').attr('id')});
        $(this).closest('.pair-rate').highlightBg(FADEDGREEN);
        $tradeForm.highlightBg(FADEDGREEN);
    })
}

function fillSell() {
    $('.bid').unbind('click').bind('click', function() {
        fillTradeForm({"side":"sell","instrument":$(this).closest('.pair-rate').attr('id')});
        $(this).closest('.pair-rate').highlightBg(FADEDRED);
        $tradeForm.highlightBg(FADEDRED);
    })
}

function formatPrice(price) {
    var dotAtSup = (price.length - price.indexOf('.')) > 2 ? false : true;
    
    var supIndex = dotAtSup ? -2 : -1;
    var boldIndex = dotAtSup ? -4: -3;
    
    return { 'sup': sup = price.slice(supIndex, price.length), 'bold' : price.slice(boldIndex, supIndex), 'small' : price.slice(0, boldIndex) };
}

function printPrice(price, $priceDiv) {
    $priceDiv.find('.old-price').html(price);
    
    $.each(formatPrice(price), function(i, value) {
        $priceDiv.find(i).html(value);
    });
}

function updatePrice(price, $priceDiv) {
    var oldPrice = $priceDiv.find('.old-price').html();
    
    if (oldPrice != price) {
        printPrice(price, $priceDiv);
        if(priceIncrease(parseFloat(oldPrice),parseFloat(price))) {
            $priceDiv.highlight('rgb(0,220,0)');
        } else {
            $priceDiv.highlight(RED);
        }
    }
}

function printRate(data, instrument) {
    var $newRate = $rateTemplate.clone().removeAttr('id');
    
    printPrice(data['ask'].toString(), $newRate.find('.ask'));
    printPrice(data['bid'].toString(), $newRate.find('.bid'));
    
    $newRate.find('.instrument').html(instrument.replace('_','/'));
    $newRate.attr('id',instrument).appendTo($ratesList);
}

function updateRate($obj, data) {
    updatePrice(data['ask'].toString(), $obj.find('.ask'));
    updatePrice(data['bid'].toString(), $obj.find('.bid'));
}

function printOrUpdateRate(obj) {
    var instr = obj['instrument'];
    var $instrDiv = $('#'+instr);
    
    if($instrDiv.length < 1) {
        printRate(obj, instr);
    } else {
        updateRate($instrDiv, obj);
    }
    
    if (openTradePairs.indexOf(instr) != -1 || openOrderPairs.indexOf(instr) != -1) {
        printPlOrDistance(obj);
    }
}

function updateRates() {
    return setInterval (function() {
        getRates();
    }, refreshTime);
}

// Transaction List functions
function startList() {
    getTradeList();
    setListType();
}

function getListType() {
    return $listType.val();
}

function getTemplateFields($template) {
    var fieldsList = [];
    
    $template.find("span[class]").each(function(i, obj) {
        fieldsList.push(obj.className);
    });
    
    return fieldsList;
}

function calculatePl(side, low, high, units, rate, home, $pl) {
    if (side == 'bid') {
        $pl.html(((high-low)*units*rate).toFixed(4)+' '+home);
    } else {
        $pl.html(((high-low)*units/rate).toFixed(4)+' '+home);
    }
    
    changePLColor($pl[0]);
}

function printPl(quote, home, low, high, units, $pl) {
    if (quote == home) {
        calculatePl('bid', low, high, units, 1, home, $pl);
    } else {
        var pair;
        var side;
        if (pairsList.indexOf(quote + '_' + home) != -1) {
            pair = quote + '_' + home;
            side = 'bid';
        } else if (pairsList.indexOf(home + '_' + quote) != -1) {
            pair = home + '_' + quote;
            side = 'ask';
        }
        
        OANDA.rate.quote([pair], function(response) {
            calculatePl(side, low, high, units, response['prices'][0][side], home, $pl);
        });
    }
}

function getPl($tx, obj) {
    var home_curr = $('#accountCurrency').html();
    var $pl = $tx.find('.profit');
    var instr = obj['instrument'].split('_')[1];
    var units = parseFloat($tx.find('.units').html()).toFixed(20);
    var price = parseFloat($tx.find('.price').html());
    
    if ($tx.find('.side').html() == 'Long') {        
        printPl(instr, home_curr, price, obj['bid'], units, $pl);
    } else {
        printPl(instr, home_curr, obj['ask'], price, units, $pl);
    }
}

function calculateDistance($tx, obj) {
    var $dist = $tx.find('.distance');
    var price;
    
    if ($tx.find('.price').html().length > 0) {
        price = parseFloat($tx.find('.price').html());
    } else {
        price = parseFloat($tx.find('.price').val());
    }

    if ($tx.find('.side').html() == 'Long') {
        $dist.html(Math.abs(((obj['ask']-price)).toFixed(6)));
    } else {        
        $dist.html(Math.abs(((price-obj['bid'])).toFixed(6)));
    }
}

function printPlOrDistance(obj) {
    var instr = obj['instrument'];
    
    $txList.find('.instrument:contains("'+instr.replace("_","/")+'")').each(function() {
        var $tx = $(this).closest('.openTxFields');
        
        if (getListType() == 'trades') {
            getPl($tx, obj);
        } else if (getListType() == 'orders') {
            calculateDistance($tx, obj);
        }
    });
}

function getList() {
    if (getListType() == 'trades') {
        getTradeList();
    } else if (getListType() == 'orders') {
        getOrderList();
    } else if (getListType() == 'positions') {
        getPositionList();
    } else if (getListType() == 'transactions') {
        getTransactionList();
    }
}

function setListType() {        
    $('#listType div').bind('click',function() {
        var type = this.innerHTML.toLowerCase();
    
        $listType.val(type);        
        getList();
    });
}

function setListTypeBtn($btn) {
    $btn.parent().find('.active').removeClass('active');
    $btn.addClass('active');
}

function buildNewOpenTx(fields, obj, $newTx) {
    $.each(fields, function(i, param) {
        var value = obj[param];
        
        if (param == 'instrument') {
            value = value.replace('_','/');
        }

        if (value == 'buy') {
            $newTx.find('.side').html('Long');
        } else if (value == 'sell') {
            $newTx.find('.side').html('Short');
        } else {
            $newTx.find('.'+param).html(value);
        }
    });
    
    if (obj['id']) {
        $newTx.attr('id',obj['id']);
    }
    
    $newTx.find('i').bind('click',function() {
        if ($newTx.hasClass('openTrade')) {
            closeTrade(obj['id']);
        } else if ($newTx.hasClass('openOrder')) {
            closeOrder(obj['id']);
        } else {
            closePosition(obj['instrument']);
        }
    });
}

function printOpenTrade(trade) {
    var $newTrade = $tradeTemplate.clone().removeAttr('id');
    buildNewOpenTx(openTradeFields, trade, $newTrade);
    
    $newTrade.appendTo($txList);
}

function printOpenOrder(order) {
    var $newOrder = $orderTemplate.clone().removeAttr('id');
    buildNewOpenTx(openOrderFields, order, $newOrder);

    $newOrder.appendTo($txList);
}

function printOpenPosition(position) {
    var $newPosition = $positionTemplate.clone().removeAttr('id');
    buildNewOpenTx(openPositionFields, position, $newPosition);
    
    $newPosition.appendTo($txList);
}

/* might need a custom build ftn to deal with transactionList
function printTransaction(transaction) {
    var $newTransaction = $transactionTemplate.clone().removeAttr('id');
    $newTransaction.appendTo($txList);
}
*/

function changeSideColor() {
    $('#txList span.side').each(function() {
        if (this.innerHTML == 'Long') {
            this.style.color = GREEN;
        } else {
            this.style.color = RED;
        }
    });
}

function showCloseIcon($openTx) {
    $openTx.find('.oa-open-tx-actions input').hide();
    $openTx.find('.icon-remove').show();
}

function showModifyIcons($openTx) {
    $openTx.find('.icon-remove').hide();
    $openTx.find('.oa-open-tx-actions input').show();
}

function checkForAllChanges($openTx) {
    if ($openTx.find('.changed').length > 0) {
        showModifyIcons($openTx);
    } else {
        showCloseIcon($openTx);
    }
}

function bindModifyEvent($field, initValue) {
    $field.unbind('click').bind('click', function() {
        initValue = initValue || this.innerHTML;
        var $newInput = convertToInput($(this));
        
        $newInput.blur(function() {
            var $newSpan = convertToSpan($newInput);
            bindModifyEvent($newSpan, initValue);
            checkForSpanChange($newSpan, initValue);
            checkForAllChanges($newSpan.closest('.openTxFields'));
        });
    });
}

function allowModifyTrade() {
    $('.openTrade').find('.takeProfit, .stopLoss, .trailingStop').each(function(i, obj) {
        bindModifyEvent($(obj));
    });
}

function allowModifyOrder() {
    $('.openOrder').find('.units, .expiry, .price, .takeProfit, .stopLoss, .trailingStop, .upperBound, .lowerBound').each(function(i, obj) {
        bindModifyEvent($(obj));
    });
}

// Trade API functions
function createAccount(form) {
    var currency = $(form).serializeArray()[0].value || 'USD';
    OANDA.account.register(currency, function(response) {
        activeAccountId = response['accountId'];
        
        startAccount();
        startList();
    });
}

function getAccountInfo() {
    OANDA.account.listSpecific(activeAccountId, function(response) {
        $.each(accSummaryFields, function(i, obj) {
            $(obj).html(response[i]);
            if (i == 'unrealizedPl' || i == 'realizedPl') {
                changePLColor(obj);
            }
        });
    });
}

function getPairsList() {    
    OANDA.rate.instruments(['displayName'], function(response) {
        var $tradeSelector = $('#pairSelector');

        $.each(response['instruments'], function(i, obj) {
            pairsList.push(obj['instrument']);
            printPairForTrade($tradeSelector, obj);
            printPairToSelect(obj);
        });
        
        $('#chartInstrumentSelector option[value=EUR_USD]').prop('selected',true);       
    });
}

function getRates() {
    if (pairsSelectedList.length > 0 || openTradePairs.length > 0 || openOrderPairs.length > 0) {
        var allPairs = pairsSelectedList.concat(openTradePairs).concat(openOrderPairs);
        
        OANDA.rate.quote(allPairs, function(response) {
            $.each(response['prices'], function(i, obj) {
                printOrUpdateRate(obj);
            });
        });
        
        fillBuy();
        fillSell();        
        removePairDiv(allPairs);
    }
}

function getTradeList() {
    OANDA.trade.list(activeAccountId, [], function(response) {        
        if(getListType() != 'trades') {
            $listType.val('trades');
        }
        setListTypeBtn($('#listTrades'));

        $txList.html('');

        $.each(response['trades'], function(i, obj) {
            printOpenTrade(obj);
            changeSideColor();
        });        
        
        allowModifyTrade();
        addPairsFromOpenTx();
    });
}

function getOrderList() {
    OANDA.order.list(activeAccountId, [], function(response) {        
        if(getListType() != 'orders') {
            $listType.val('orders');
        }        
        setListTypeBtn($('#listOrders'));
        
        $txList.html('');
                
        $.each(response['orders'], function(i, obj) {
            printOpenOrder(obj);
            changeSideColor();
        });
        
        allowModifyOrder();
        addPairsFromOpenTx();
    });
}

function getPositionList() {
    OANDA.position.list(activeAccountId, function(response) {
        setListTypeBtn($('#listPositions'));
        $txList.html('');
        
        $.each(response['positions'], function(i, obj) {
            printOpenPosition(obj);
            changeSideColor();
        });
    });
}

function closePosition(instr) {
    OANDA.position.close(activeAccountId, instr, function(response) {
        alertResponse(response, 'trade');
        removePairFromOpenTx(response['instrument'], openTradePairs);
    });
}

function getTransactionList() {
    setListTypeBtn($('#listTransactions'));
    $txList.html('');
    
    /*
    OANDA.transaction.list(activeAccountId, [], function(response) {
        $.each(response['transactions'], function(i, obj) {
            printTransaction(obj);
        });
    });
    */
    
    $txList.append($transactionTemplate.removeAttr('id'));
}

function createTrade(d) {    
    OANDA.trade.open(activeAccountId, d['instrument'], d['units'], d['side'], d['opt'], function(response) {
        //create a proper alert with return info, or some other way of notifying the client of trade creation
        alertResponse(response, 'trade');
    });
}

function closeTrade(tradeId) {
    OANDA.trade.close(activeAccountId, tradeId, function(response) {
        alertResponse(response, 'trade');
        removePairFromOpenTx(response['instrument'], openTradePairs);
    });
}

function modifyTrade($openTrade) {
    var fields = {};
    var tradeId = $openTrade.attr('id');
    
    $.each([ 'takeProfit', 'stopLoss', 'trailingStop' ], function(i, value) {
        fields[value] = $openTrade.find('.'+value).html();
    });
    
    OANDA.trade.change(activeAccountId, tradeId, fields, function(response) {
        alertResponse(response, 'trade');
    });
}

function createOrder(d) {
    var expiry = getExpiryFromHours(d['expiry']);
    
    OANDA.order.open(activeAccountId, d['instrument'], d['units'], d['side'], d['price'], expiry, d['type'], d['opt'], function(response) {
        //create a proper alert with return info, or some other way of notifying the client of order creation
        alertResponse(response, 'order');
    });
}

function closeOrder(orderId) {
    OANDA.order.close(activeAccountId, orderId, function(response) {
        alertResponse(response, 'order');
        removePairFromOpenTx(response['instrument'], openOrderPairs);
    });
}

function modifyOrder($openOrder) {
    var fields = {};
    var orderId = $openOrder.attr('id');
    
    $.each([ 'units', 'expiry', 'price', 'takeProfit', 'stopLoss', 'trailingStop', 'upperBound', 'lowerBound' ], function(i, value) {
        fields[value] = $openOrder.find('.'+value).html();
    });
        
    OANDA.order.change(activeAccountId, orderId, fields, function(response) {
        alertResponse(response, 'order');
    });
}

// After document loads
$(function() {
    $('#accountId').val(5807895);
    
    getPairsList(pairsList);
    activeAccountId = $('#accountId').val();
    accSummaryFields = getDisplayedAccountFields($('#accountSummary'));
    $tradeForm = $('#tradeForm');
    $pairsSelected = $('#pairsSelected');
    $pairsNotSelected = $('#pairsNotSelected');
    $ratesList = $('#ratesList');
    $listType = $('input[name=listType]');
    $txList = $('#txList');
    $rateTemplate = $('#rateTemplate');
    $tradeTemplate = $('#tradeTemplate');
    $orderTemplate = $('#orderTemplate'); 
    $positionTemplate = $('#positionTemplate');
    $transactionTemplate = $('#transactionTemplate');   
    openTradeFields = getTemplateFields($tradeTemplate);
    openOrderFields = getTemplateFields($orderTemplate);
    openPositionFields = getTemplateFields($positionTemplate);
    
    windowResize();    
    startAccount();
    enableOpenTxSideAndType();
    startRates();
    startList();
    
    var now = new Date();
    now.setSeconds(now.getSeconds() - 100);
    var chart = new OCandlestickChart(document.getElementById('candles'), 
                    document.getElementById('chart'), document.getElementById('control'), document.getElementById('error'), {'startTime':now,'granularity':'S5'});
    google.setOnLoadCallback( function() { chart.render(); } );
    
    $('#chartInstrumentSelector').change(function() {
        chart.setInstrument($('#chartInstrumentSelector').val());
    });
    
    chart.streamingEnabled = true;
});
