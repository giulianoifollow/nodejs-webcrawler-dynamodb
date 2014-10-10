var http = require('http');
var cheerio = require('cheerio');
var AWS = require('aws-sdk');

//Base da url de pesquisa
var BASE_URL = 'http://www.peixeurbano.com.br';

//Path inicial
var PATH = '/sao-paulo';

//Carrega a configuração da Access Key
AWS.config.loadFromPath('./config-aws.json');

//Configura para usar a região escolhida
AWS.config.update({region: 'sa-east-1'});


var dd = new AWS.DynamoDB();

//Nome da tabela que iremos usar
var tableName = 'Urls';

//Método que inclui/atualiza na tabela do nodejs
function putItem (url, nm, solded, price) {
    var item = {
        'url': { 'S': url }
        , 'name' : { 'S': nm }
    };

    if(solded != null && solded != '') item.solded = { 'S': solded };
    if(price != null && price != '') item.price = { 'S': price };

    dd.putItem({
        'TableName': tableName,
        'Item': item
    }, function(err, data) {
        err && console.log(err);
    });
}

//Método que filtra o body para coletar informações
function loadBody(type, body, url) {
    var $ = cheerio.load(body);

    if(type == 'home') {
        //Seletor para pegar a url do anúncio
        $('a.deal-link').each(function(){
            var h = $(this).attr('href');
            console.log('Coletou url: ' + h);

            var u = BASE_URL + h;
            
            //Chamo novamente a url para coletar informações do anúncio
            requestUrl(u, function(res){getCallback(res, 'item', h)});

            return true;

        });
    } else {
        //Seletor que carregará o título do anúncio
        var fullName = $('.deal-title').text();
        
        //Seletor que procura pelo total vendido
        var solded = $('#totalsold').text();
        
        //Seletor que captura o preço
        var price = $('span.js-deal-price').text();

        console.log(url + '=' + solded + ': ' + price);

        putItem(url, fullName, solded, price);
    }
}

//Callback da chamada http
function getCallback(response, type, url){
    var body = '';
    response.on('data', function (chunk) {
        body += chunk;
    });
    response.on('end', function(){
        //console.log("Corpo da mensagem: " + body);
        loadBody(type, body, url);
    });
}

//Faz o request para uma url
function requestUrl(url, cb) {
    http.get(url, cb)
        .on('error', function(e){
            console.log("Ocorreu um erro: " + e.message);
        });
}

var url = BASE_URL + PATH;
//Chamo a capa do site para carregar os anúncios
requestUrl(url, function(res){getCallback(res, 'home', url)});
