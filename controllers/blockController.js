var blockModel = require('../models/blockModel.js');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
let log = [];

function authenticate_block(block, callback){
    let tryHash = crypto.createHash('sha256').update(block.index + block.timeStamp+block.data+block.prevHash).digest('hex');
    console.log(block);
    console.log(block.toString());
    if((chain[chain.length-1].curHash === block.prevHash) && (block.curHash===tryHash) && (chain[chain.length-1].index === block.index-1)){
        chain.push(block);

        writeJson();
        callback();
    }
}

function writeJson(){
    let name = 'store_'.concat(app.get('port')).concat('.json');
    fs.writeFile(name, JSON.stringify(chain), function(err) {
        if(err) console.log('error', err);
    });
    console.log('Data written to file');
}

function readJson() {
    let name = 'store_'.concat(app.get('port')).concat('.json');
    fs.readFile(name, (err,data) => {
        if(err) console.log('error', err);
        chain = JSON.parse(data);
    });
    console.log('Synced');
    return true;
}

function authenticate_chain(o_chain, callback){
    if((o_chain[0].index === 0) && (o_chain[0].curHash === crypto.createHash('sha256').update(0 + 0 + o_chain[0].data + 0).digest('hex'))){
        console.log("prvi if passno");
        for(let i = 1; i < o_chain.length; i++){
            let tryHash = crypto.createHash('sha256').update(o_chain[i].index + o_chain[i].timeStamp+o_chain[i].data+o_chain[i].prevHash).digest('hex');
            if((o_chain[i-1].curHash !== o_chain[i].prevHash) || (o_chain[i].curHash!==tryHash) || (o_chain[i].index !== o_chain[i-1].index+1)){
                return false;
            }
        }
        callback();
    }else{
        return false;
    }
}
//TODO: add user balance calculatro / skin unlocker

function calculate_balance(id){
    let balance = 0;
    for(let i = 0; i < chain.length; i++){
        if(chain[i].data.id === id){
            if(chain[i].data.skin === null){
                balance += parseInt(chain[i].data.amount);
            }else{
                balance -= parseInt(chain[i].data.amount);
            }
        }
    }
    return balance;
}

function gather_skins(id){
    let skins = [];
    for(let i = 0; i < chain.length; i++){
        if(chain[i].data.id === id){
            if(chain[i].data.skin !== null){
                skins.push(chain[i].data.skin);
            }
        }
    }
    return skins;
}

/**
 * blockController.js
 *
 * @description :: Server-side logic for managing blocks.
 */
module.exports = {

    /**
     * blockController.list()
     */
    list: function (req, res) {
        log.push("List GET");
        res.json(chain);
    },

    get_coin: function(req,res){
        let balance = 0;
        balance = calculate_balance(req.params.id);
        res.json({
            "coins": balance
        });
    },

    get_skins: function(req,res){
        let skins = [];
        skins = gather_skins(req.params.id);
        console.log(skins);
        res.json({
            "skins": skins
        })
    },

    give_coin: function(req,res){
        //TODO: get data from req

        let data = {
            'id' : req.body.id,
            'skin' : null,
            'amount' : req.body.amount
        };

        console.log("delam blok");

        let i = chain.length;

        let p_hash;
        if(chain.length === 0){
            p_hash = 0;
        }else{
            p_hash = chain[chain.length-1].curHash;
        }
        let c_hash = crypto.createHash('sha256').update(i+Date.now()+data+p_hash).digest('hex')

        let block = new blockModel({
            index : i,
            timeStamp : Date.now(),
            data : data,
            curHash : c_hash,
            prevHash : p_hash
        });

        console.log("block naret");

        //TODO: verification
        chain.push(block);
        let ret = calculate_balance(req.body.id);
        console.log(ret);
        res.json({
            "id": null,
            "coins": ret,
            "skin":null
        });
    },

    give_skin: function(req,res){

        let data = {
            'id' : req.body.id,
            'skin' : req.body.skin,
            'amount' : req.body.amount
        };

        console.log("da mi ga ješ" + req.body.skin);

        let i = chain.length;

        let p_hash;
        if(chain.length === 0){
            p_hash = 0;
        }else{
            p_hash = chain[chain.length-1].curHash;
        }
        let c_hash = crypto.createHash('sha256').update(i+Date.now()+data+p_hash).digest('hex')

        let block = new blockModel({
            index : i,
            timeStamp : Date.now(),
            data : data,
            curHash : c_hash,
            prevHash : p_hash
        });

        chain.push(block);
        let ret = calculate_balance(req.body.id);
        res.json({
            "id": null,
            "coins": ret,
            "skin": null
        });
    },

    //TODO: delete later
    inspect: function(req,res){
        log.push("Klican je bil inspect");
        let tmp_block = JSON.parse(req.body.block);
        if ((tmp_block.index - 1) === chain[chain.length-1].index){
            authenticate_block(tmp_block, function () {
                console.log("tuj blok dodan");
            });
        }else if(tmp_block.index >= (chain[chain.length-1].index+1)){
            let tmp_port = req.body.port;
            http.get('http://localhost:'.concat(tmp_port).concat('/send_chain'));
        }
        res.sendStatus(200);
    },

    /**
     * blockController.show()
     */
    show: function(req, res) {
        var id = req.params.id;
        blockModel.findOne({_id: id}, function (err, block) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting block.',
                    error: err
                });
            }
            if (!block) {
                return res.status(404).json({
                    message: 'No such block'
                });
            }
            return res.json(block);
        });
    },

    /**
     * blockController.create()
     */
    create: function (req, res) {
        let i = chain.length;
        let dt = new Date();

        //to mi ni všeč
        //naredi tak da sproti preverja pa pusha
        //v primeru da nekaj ne štima naj se zavrže
        //pol še počekiraj če se je sploh kaj pushalo, pa v primeru da ne ne naredi blocka
        // neka simple funkcija za verifikacijo bi bla tudi super
        // probaj se zmislit nekaj v smislu da ne rabiš stalno nazaj gledat za n mest,

        let dat = un_verified;

        let pHash = chain[chain.length-1].curHash;
        let cHash = crypto.createHash('sha256').update(i+dt+dat+pHash).digest('hex');

        let block = new blockModel({
            index : i,
            timeStamp : dt,
            data : dat,
            curHash : cHash,
            prevHash : pHash
        });

        un_verified = [];

        authenticate_block(block, function(){
            axios.post('http://localhost:3000/block', {
                block: JSON.stringify(block),
                port: app.get('port')
            })
                .then((res) => {
                    console.log(`statusCode: ${res.statusCode}`);
                    console.log("we good!");
                })
                .catch((error) => {
                    console.log("error");
                });
        });
        res.redirect('/');
    },

    last: function(req,res){
        res.json(chain[chain.length-1]);
    },

    whole: function(req,res){
      res.json(chain);
    },

    /**
     * blockController.update()
     */
    update: function (req, res) {
        var id = req.params.id;
        blockModel.findOne({_id: id}, function (err, block) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting block',
                    error: err
                });
            }
            if (!block) {
                return res.status(404).json({
                    message: 'No such block'
                });
            }

            block.index = req.body.index ? req.body.index : block.index;
			block.timeStamp = req.body.timeStamp ? req.body.timeStamp : block.timeStamp;
			block.data = req.body.data ? req.body.data : block.data;
			block.curHash = req.body.curHash ? req.body.curHash : block.curHash;
			block.prevHash = req.body.prevHash ? req.body.prevHash : block.prevHash;
			
            block.save(function (err, block) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating block.',
                        error: err
                    });
                }

                return res.json(block);
            });
        });
    },

    send: function(req, res){
        axios.post('http://localhost:3000/', {
            chain: JSON.stringify(chain),
            port: app.get('port')
        })
            .then((res) => {
                console.log(`statusCode: ${res.statusCode}`);
                console.log("we good!");
            })
            .catch((error) => {
                console.log("error");
            });
        res.render('index', {title: 'chain gang', chain: chain});
    },

    add_wallet: function(req,res){
        let add = req.body.n_wal;
        wallets.push(add);
        console.log("evo ga");
        for (let i = 0; i < wallets.length; i++){
            console.log(wallets[i]);
        }
        res.redirect('/');
    },

    trans_req: function(req,res){
        let n_wallet = req.body.address;
        console.log("kje umres?");
        let search = "0446f502285d9ac9254b6a2244f591c3d817ea59ebff3b5b7d7c0bf0e16d0efd54012f5f6a14bdea4a8c62f1c2aef38be259d6239edb69fde807e4d365f42d2792";
        let stopper = false;
        let wallet_bal = false;
        console.log(chain);

        if(un_verified.length !== 0) {
            console.log("ni prazn");
            for (let i = un_verified.length - 1; (i > -1) || (stopper === false); i--) {
                if (un_verified[i].sender === search) {
                    wallet_bal = un_verified[i].s_balance_after;
                    stopper = true;
                } else if (un_verified[i].receiver === search) {
                    wallet_bal = un_verified[i].r_balance_after;
                    stopper = true;
                }
            }
        }
        if(chain.length !== 0) {
            console.log("veriga ma nekaj");
            for (let i = chain.length - 1; (i > -1) || (stopper === false); i--) {
                console.log("prvi for");
                for (let j = chain[i].data.length - 1; (i > -1) ||   (stopper === false); i--) {
                    console.log("drugi for");
                    if (chain[i].data[j].sender === search) {
                        wallet_bal = chain[i].data[j].s_balance_after;
                        stopper = true;
                    } else if (chain[i].data[j].receiver === search) {
                        wallet_bal = chain[i].data[j].r_balance_after;
                        stopper = true;
                    }
                }
            }
        }

        if(wallet_bal === false){
            res.redirect('/');
        }

        console.log("tukaj?");

        let w_initialisation={
            sender: "0446f502285d9ac9254b6a2244f591c3d817ea59ebff3b5b7d7c0bf0e16d0efd54012f5f6a14bdea4a8c62f1c2aef38be259d6239edb69fde807e4d365f42d2792",
            s_balance_before: wallet_bal,
            s_balance_after: wallet_bal-100,
            receiver: n_wallet,
            r_balance_before: 0,
            r_balance_after: 100,
            time_stamp: Date(),
            signature: "Magic"
        };
        //dodaj signature zadeve
        un_verified.push(w_initialisation);
        res.redirect('/');
    },

    unverified_show: function(req,res){
        res.json(un_verified);
    },

    transaction_push: function(req,res){
        //naj wallet zgenerira celi block za push.
        //tu se samo striktno preveri,
        //ko ga wallet stacka naj se mu poščje podatke;

        var s_wallet = req.body.address;
        let r_wallet = req.body.target;
        let s_wallet_bal = false;
        let stopper = false;

        if(un_verified.length !== 0) {
            for (let i = un_verified.length - 1; (i > -1) || (stopper === false); i--) {
                if (un_verified[i].sender === s_wallet) {
                    s_wallet_bal = un_verified[i].s_balance_after;
                    stopper = true;
                } else if (un_verified[i].receiver === s_wallet) {
                    s_wallet_bal = un_verified[i].r_balance_after;
                    stopper = true;
                }
            }
        }
        if(chain.length !== 0) {
            for (let i = chain.length - 1; (i > -1) || (stopper === false); i--) {
                for (let j = chain[i].data.length - 1; (i > -1) ||   (stopper === false); i--) {
                    if (chain[i].data[j].sender === s_wallet) {
                        s_wallet_bal = chain[i].data[j].s_balance_after;
                        stopper = true;
                    } else if (chain[i].data[j].receiver === s_wallet) {
                        s_wallet_bal = chain[i].data[j].r_balance_after;
                        stopper = true;
                    }
                }
            }
        }

        let r_wallet_bal = false;
        stopper = false;

        if(un_verified.length !== 0) {
            for (let i = un_verified.length - 1; (i > -1) || (stopper === false); i--) {
                if (un_verified[i].sender === r_wallet) {
                    r_wallet_bal = un_verified[i].s_balance_after;
                    stopper = true;
                } else if (un_verified[i].receiver === r_wallet) {
                    r_wallet_bal = un_verified[i].r_balance_after;
                    stopper = true;
                }
            }
        }
        if(chain.length !== 0) {
            for (let i = chain.length - 1; (i > -1) || (stopper === false); i--) {
                for (let j = chain[i].data.length - 1; (i > -1) ||   (stopper === false); i--) {
                    if (chain[i].data[j].sender === r_wallet) {
                        r_wallet_bal = chain[i].data[j].s_balance_after;
                        stopper = true;
                    } else if (chain[i].data[j].receiver === r_wallet) {
                        r_wallet_bal = chain[i].data[j].r_balance_after;
                        stopper = true;
                    }
                }
            }
        }



        if(s_wallet_bal === false || r_wallet_bal ===false){
            res.redirect('/');
        }

        let ammount = req.body.ammount;

        let w_initialisation={
            sender: s_wallet,
            s_balance_before: s_wallet_bal,
            s_balance_after: s_wallet_bal-ammount,
            receiver: r_wallet,
            r_balance_before: r_wallet_bal,
            r_balance_after: r_wallet_bal + ammount,
            time_stamp: Date(),
            signature: "Magic"
        };

        //dodaj signature zadeve
        un_verified.push(w_initialisation);
        //iz njih se potem tudi bere
        res.redirect('/');
    },

    comp: function(req,res){
        //sploh ne vem kaj dela
        //počekiraj malo pa pol ugotovi ali je res potrebno
        // v primeru da ne zbriši pa ne pozabi tudi v routes
        res.redirect('/');
    },

    check: function(req, res){
        let tmp_chain = JSON.parse(req.body.body);
        console.log(tmp_chain);
        authenticate_chain(tmp_chain, function () {
            chain = tmp_chain;
            writeJson();
        });
      res.render('index', {title: 'chain gang', chain: chain});
    },
};
