import { User } from './db/user'
import * as bcrypt from 'bcrypt';
import { getHashes } from 'crypto';

// Not using types, because koa-passport is out of date, and importing it bring
// old versions of Koa (which breaks all async koa functions app wide)
const passport = require('koa-passport');
const LocalStrategy = require('passport-local');

const verify = (username: string, password: string, done: (...args: any[]) => any) => {
    User.FindUsername(username).then((user) => {
        if (!user) {
            return done(null, false);
        }
        const valid = bcrypt.compareSync(password, user.passwordHash);
        if (valid) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    })
}

export function getHash(password: string): string {
    return bcrypt.hashSync(password, 10);
}

export function passwordOk(password: string): boolean {
    // To be determined if this is sufficient
    return (password.length > 8);
}

passport.serializeUser(function (user: User, done: (...args: any[]) => any) { done(null, user.userId) })

passport.deserializeUser(function (userId: number, done: (...args: any[]) => any) {
    // TODO: This means a lot of DB calls, there probably is a better way.
    User.Find(userId)
        .then((user) => { done(null, user) })
        .catch(err => done(err))
})

passport.use(new LocalStrategy(verify));