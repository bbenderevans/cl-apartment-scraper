const axios = require('axios');
const cheerio = require('cheerio');
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const dbName = 'cl';

let $;

cleanup();

function cleanup() {
    // connect to mongodb and drop the db
    MongoClient.connect(url)
    .then((client) => {
        client.db(dbName).dropDatabase().then(() => {
            client.close();
            loadDoc();
        });
    });
}

function loadDoc() {
    axios.get('https://www.craigslist.org/about/sites')
    .then((response) => {
        $ = cheerio.load(response.data);
        parsePrimaryRegions();
    });
}

function parsePrimaryRegions() {
    let primaryRegionId = 1;
    let primaryRegions = []
    // find each primary region in the html doc
    $('h1').each(function() {
        // build record and push to array
        let primaryRegionName = $(this).text();
        let primaryRegion = { '_id': primaryRegionId, 'name': primaryRegionName };
        primaryRegions.push(primaryRegion);
        primaryRegionId++;
    });
    // do the insert
    MongoClient.connect(url)
    .then((client) => {
        client.db(dbName).collection('primaryRegions').insertMany(primaryRegions)
        .then(() => {
            client.close();
            parseSecondaryRegions();
        });
    });
}

function parseSecondaryRegions() {
    MongoClient.connect(url)
    .then((client) => {
        // loop through each primary region
        let primaryRegions = client.db(dbName).collection('primaryRegions').find({});
        let secondaryRegionId = 1;
        let secondaryRegions = [];
        primaryRegions.forEach((primaryRegion) => {
            // find cooresponding secondary regions in the html doc
            let sel = 'h1:contains("' + primaryRegion.name + '")';
            $(sel).next('div').find('h4').each(function() {
                // build record and push to array
                let primaryRegionId = primaryRegion._id;
                let secondaryRegionName = $(this).text();
                let secondaryRegion = { '_id': secondaryRegionId, 'primaryRegionId': primaryRegionId, 'name': secondaryRegionName };
                secondaryRegions.push(secondaryRegion);
                secondaryRegionId++;
            });
        })
        .then(() => {
            // do the insert
            client.db(dbName).collection('secondaryRegions').insertMany(secondaryRegions)
            .then(() => {
                client.close();
                parseTertiaryRegions();
            });
        });
    });
}

function parseTertiaryRegions() {
    MongoClient.connect(url)
    .then((client) => {
        // loop through each secondary region
        let secondaryRegions = client.db(dbName).collection('secondaryRegions').find({});
        let tertiaryRegionId = 1;
        let tertiaryRegions = [];
        secondaryRegions.forEach((secondaryRegion) => {
            // find cooresponding tertiary regions in the html doc
            let sel = 'h4:contains("' + secondaryRegion.name + '")';
            $(sel).next('ul').find('a').each(function() {
                // build record and push to array
                let secondaryRegionId = secondaryRegion._id;
                let tertiaryRegionName = $(this).text();
                let tertiaryRegionUrl = $(this).attr('href');
                let tertiaryRegion = { '_id': tertiaryRegionId, 'secondaryRegionId': secondaryRegionId, 'name': tertiaryRegionName, 'url': tertiaryRegionUrl };
                tertiaryRegions.push(tertiaryRegion);
                tertiaryRegionId++;
            });
        })
        .then(() => {
            // do the insert
            client.db(dbName).collection('tertiaryRegions').insertMany(tertiaryRegions)
            .then(() => {
                client.close();
            });
        });
    });
}

