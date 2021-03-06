/**
 * Copyright (c) 2016 Samsung Electronics, Inc.,
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

const database = require("../util/database");
const log = require('../util/logging');
const route = require('./route');
const project = require('./project');
const http = require('http');
const fs = require('fs');
const Promise = require('bluebird');
const rp = require('request-promise');
const mysql = require("mysql");
const _ = require("lodash");

function getUserListByProjectDatabaseName(dbName) {
    const sql = "SELECT userId FROM " + mysql.escapeId(dbName) + ".Account ORDER BY userId ASC";
    return database.exec(sql)
        .then((rows) => {
            return rows;
        })
        .catch((err) => {
            log.error(err);
            return null;
        });
}

function sendUserListInDatabaseNameList(dbNameList, res) {
    let allRows = [];
    let promises = [];

    dbNameList.forEach((dbName) => {
        promises.push(new Promise((resolve, reject) => {
            getUserListByProjectDatabaseName(dbName)
                .then((rows) => {
                    allRows = _.union(allRows, rows);
                    resolve();
                })
                .catch((err) => {
                    log.error(err);
                    reject();
                })
        }));
    });

    Promise.all(promises)
        .then(() => {
            allRows = _.uniq(allRows, (row) => {
                return row.userId;
            });
            allRows = _.sortBy(allRows, 'userId');
            res.send({status:'ok', rows: allRows});
        })
        .catch((err) => {
            log.error(err);
            res.send({status:"fail", errorMessage: err.message});
        });
}

exports.getAll = function(req, res) {
   project.getDatabaseNameList()
       .then((rows) => {
           const dbNameList = _.map(rows, 'dbName');
           sendUserListInDatabaseNameList(dbNameList, res);
       })
       .catch((err) => {
           log.error('Failed to get the DB name list of the ' + groupName + ' group: ' + err);
           res.send({status:"fail", errorMessage: err.message});
       });
};

exports.getByProject = function(req, res) {
    const projectName = mysql.escape(req.params.projectName);
    project.getDatabaseNameByProjectName(projectName)
        .then((dbName) => {
            getUserListByProjectDatabaseName(dbName)
                .then((rows) => {
                    res.send({status:'ok', rows: rows});
                })
                .catch((err) => {
                    log.error(err);
                    res.send({status:"fail", errorMessage: err.message});
                });
        })
        .catch((err) => {
            log.error('Failed to get the DB name of the ' + projectName + ' project: ' + err);
            res.send({status:"fail", errorMessage: err.message});
        });
};

exports.getByGroup = function(req, res) {
    const groupName = mysql.escape(req.params.groupName);

    project.getDatabaseNameListByGroupName(groupName)
        .then((rows) => {
            let dbNameList = _.map(rows, 'dbName');
            sendUserListInDatabaseNameList(dbNameList, res);
        })
        .catch((err) => {
            log.error('Failed to get the DB name list of the ' + groupName + ' group: ' + err);
            res.send({status:"fail", errorMessage: err.message});
        });
};

exports.getByLab = function(req, res) {

};

function processReturnedData(data) {
    return data.replace(/((\])|(\[))/g,'').replace(/(^\s*)|(\s*$)/g,'');
}

function loadUserInfo(userId, userInfoUrl, userInfoList) {
    return rp(userInfoUrl + userId)
        .then((data) => {
            data = processReturnedData(data);
            if (!data || !validateUserInfoJson(data, userId)) {
                log.error('Not found user data: ' + userId);
                userInfoList.push({'userId':userId});
            } else {
                const infoJson = JSON.parse('' + data);
                userInfoList.push({
                    'userId':userId,
                    'name':infoJson.cn,
                    'department':infoJson.department,
                    'title':infoJson.title,
                    'employeeNumber':infoJson.employeenumber});
            }
        })
        .catch((err) => {
            log.error(err);
            userInfoList.push({'userId':userId});
        });
}

exports.getMoreInfoByUserIdList = function(req, res) {
    const configText = fs.readFileSync("./config.json", 'utf8');
    const configJson = JSON.parse(configText);
    const userInfoUrl = configJson.userInfoUrl;
    const userIdList = req.params.userIdList.split(",");

    let userInfoList = [];
    let promises = [];
    userIdList.forEach((userId) => {
        promises.push(loadUserInfo(userId, userInfoUrl, userInfoList));
    });

    Promise.all(promises)
        .then(() => {
            res.send({status:'ok', rows: userInfoList});
        })
        .catch((err) => {
            log.error(err);
            res.send({status:"fail", errorMessage: err.message});
        });
};

function validateUserInfoJson(data, userid) {
    if(data.indexOf("\"userid\":\"" + userid + "\"") < 0) {
        log.error('Incorrect result from user info server');
        return false;
    }
    return true;
}

exports.getUserCountByProjectName = function(req, res) {
    const projectName = mysql.escape(req.params.projectName);
    project.getDatabaseNameByProjectName(projectName)
        .then((dbName) => {
            const sql = "SELECT COUNT(userId) AS userCount FROM " + mysql.escapeId(dbName) + ".Account";
            database.exec(sql)
                .then((rows) => {
                    res.send({status:'ok', value: rows[0].userCount});
                })
                .catch((err) => {
                    log.error(err);
                    res.send({status:"fail", errorMessage: err.message});
                });
        })
        .catch((err) => {
            log.error(err);
            res.send({status:"fail", errorMessage: err.message});
        });
};