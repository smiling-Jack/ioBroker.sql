exports.init = function () {
    return [
        "CREATE DATABASE iobroker;",
        "CREATE TABLE iobroker.dbo.sources    (id INTEGER NOT NULL PRIMARY KEY IDENTITY(1,1), name varchar(255));",
        "CREATE TABLE iobroker.dbo.datapoints (id INTEGER NOT NULL PRIMARY KEY IDENTITY(1,1), name varchar(255), type INTEGER);",
        "CREATE TABLE iobroker.dbo.ts_number  (id INTEGER, ts BIGINT, val REAL, ack BIT, _from INTEGER, q INTEGER);",
        "CREATE TABLE iobroker.dbo.ts_string  (id INTEGER, ts BIGINT, val TEXT, ack BIT, _from INTEGER, q INTEGER);",
        "CREATE TABLE iobroker.dbo.ts_bool    (id INTEGER, ts BIGINT, val BIT,  ack BIT, _from INTEGER, q INTEGER);"
    ];
};

exports.destroy = function () {
    return [
        "DROP TABLE iobroker.dbo.ts_number;",
        "DROP TABLE iobroker.dbo.ts_string;",
        "DROP TABLE iobroker.dbo.ts_bool;",
        "DROP TABLE iobroker.dbo.sources;",
        "DROP TABLE iobroker.dbo.datapoints;",
        "DROP DATABASE iobroker;",
        "DBCC FREEPROCCACHE;"
    ];
};

exports.insert = function (index, state, from, db) {
    if (db === 'ts_bool') state.val = state.val ? 1 : 0;
    return "INSERT INTO iobroker.dbo." + db + " (id, ts, val, ack, _from, q) VALUES(" + index + ", " + state.ts + ", " + state.val + ", " + (state.ack ? 1 : 0) + ", " + (from || 0) + ", " + state.q + ");";
};

exports.retention = function (index, db, retention) {
    var d = new Date();
    d.setSeconds(-retention);
    var query = "DELETE FROM iobroker.dbo." + db + " WHERE";
    query += " id=" + index;
    query += " AND ts < " + Math.round(d.getTime() / 1000);
    query += ";";
    return query;
};

exports.getIdSelect = function (name) {
    return "SELECT id, type FROM iobroker.dbo.datapoints WHERE name='" + name + "';";
};
exports.getIdInsert = function (name, type) {
    return  "INSERT INTO iobroker.dbo.datapoints (name, type) VALUES('" + name + "', " + type + ");";
};

exports.getFromSelect = function (from) {
    return "SELECT id FROM iobroker.dbo.sources WHERE name='" + from + "';";
};

exports.getFromInsert = function (from) {
    return "INSERT INTO iobroker.dbo.sources (name) VALUES('" + from + "');";
};

exports.getHistory = function (db, options) {
    var query = "SELECT ";
    if (!options.start && options.count) {
        query += " TOP " + options.count;
    }
    query += " ts, val" +
        (!options.id  ? (", " + db + ".id as id") : "") +
        (options.ack  ? ", ack" : "") +
        (options.from ? (", iobroker.dbo.sources.name as 'from'") : "") +
        (options.q    ? ", q" : "") + " FROM iobroker.dbo." + db;

    if (options.from) {
        query += " INNER JOIN iobroker.dbo.sources ON iobroker.dbo.sources.id=iobroker.dbo." + db + "._from";
    }

    var where = "";

    if (options.id) {
        where += " iobroker.dbo." + db + ".id=" + options.id;
    }
    if (options.end) {
        where += (where ? " AND" : "") + " iobroker.dbo." + db + ".ts < " + options.end;
    }
    if (options.start) {
        where += (where ? " AND" : "") + " iobroker.dbo." + db + ".ts >= " + options.start;
    }

    if (where) query += " WHERE " + where;


    query += " ORDER BY iobroker.dbo." + db + ".ts";
    if (!options.start && options.count) {
        query += " DESC";
    } else {
        query += " ASC";
    }
    query += ";";
    return query;
};