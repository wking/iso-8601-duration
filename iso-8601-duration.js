let names = ["years", "months", "days", "hours", "minutes", "seconds"];

function invert(duration) {
    let obj = {};
    if("weeks" in duration) {
        obj.weeks = -duration.weeks;
    } else {
        for(let name of names) {
            obj[name] = -duration[name];
        }
    }
    return obj;
}

class Iso8601Duration {
    constructor(init) {
        let weeks = "weeks" in init;

        for(let name of names) {
            if(name in init) {
                if(weeks) {
                    throw new Error(`Iso8601Duration: object cannot contain '${name}' and 'weeks'`);
                } else {
                    this[name] = Number(init[name]);
                    if(Number.isNaN(this[name])) {
                        throw new TypeError(`Iso8601Duration: '${name}' in object is not a number: '${this[name]}'`);
                    }
                }
            } else if(!weeks) {
                this[name] = 0;
            }
        }

        if(weeks) {
            this.weeks = Number(init.weeks);
        }
    }

    toString() {
        if("weeks" in this) {
            return `P${this.weeks}W`;
        }
        let ret = "P";
        for(let name of names) {
            if(name === "hours") {
                ret += "T";
            }
            if(this[name]) {
                ret += this[name] + name.charAt(0).toUpperCase();
            }
        }

        if(ret === "PT") {
            return "PT0S";
        }
        return ret;
    }

    clone() {
        return new this.constructor(this);
    }

    add(b) {
        if(typeof(b) !== "object") {
            throw new TypeError("Iso8601Duration.prototype.add: expects object");
        }
        let clone = this.clone();
        if("weeks" in clone) {
            if("weeks" in b) {
                clone.weeks += b.weeks;
                return clone;
            }
            if(names.some((name) => name in clone)) {
                throw new Error("Iso8601Duration.prototype.add: incompatible objects");
            }
            return clone;
        }

        for(let name of names) {
            if(name in b) {
                clone[name] += b[name];
            }
        }
        return clone;
    }

    reducePrecision(to) {
        if(names.indexOf(to) === -1) {
            throw new Error(`Unknown component: ${to}`);
        }
        if("weeks" in this) {
            if(to === "year" || to === "month") {
                return new this.constructor({});
            }
            return new this.constructor({
                "weeks": this.weeks
            });
        }
        let init = {};
        for(let name of names) {
            init[name] = this[name];
            if(name === to) {
                break;
            }
        }
        return new this.constructor(init);
    }

    addToDate(date) {
        date = new Date(date);
        if("weeks" in this) {
            throw new Error("Not implemented");
        }
        for(let name of names) {
            let val = this[name];
            if(val) {
                let methodName;
                switch(name) {
                    case "days":
                        methodName = "Date";
                        break;
                    case "years":
                        methodName = "FullYear";
                        break;
                    case "seconds":
                        methodName = "Milliseconds";
                        val = Math.round(val * 1000);
                        break;
                }
                if(!methodName) {
                    methodName = name.charAt(0).toUpperCase() + name.slice(1);
                }
                date["setUTC" + methodName](date["getUTC" + methodName]() + val);
            }
        }
        return date;
    }

    subFromDate() {
        this.addToDate.apply(invert(this));
    }

    [Symbol.toStringTag]() {
        return `Iso8601Duration(${this.toString()})`;
    }
}

Iso8601Duration.parse = function(str) {
    str = String(str).replace(/,/g, ".");

    let matches = str.match(/^P(\d+(?:\.\d+)?)W$/);
    if(matches) {
        return new this({
            "weeks": Number(matches[1])
        });
    }
    let parts = names.map((name) => `(?:(\\d+(?:\\.\\d+)?)${name.charAt(0).toUpperCase()})?`);
    matches = str.match(new RegExp(`^P${parts.slice(0, 3).join("")}(?:T${parts.slice(3).join("")})?\$`));
    if(!matches) {
        throw new Error(`Iso8601Duration.parse: '${str}' is not a valid ISO 8601 duration`);
    }
    matches = matches.slice(1).map(Number);
    let init = {};
    for(let [i, name] of names.entries()) {
        let match = matches[i];

        if(!Number.isNaN(match)) {
            init[name] = match;
        }
    }
    return new this(init);
};

export default Iso8601Duration;
