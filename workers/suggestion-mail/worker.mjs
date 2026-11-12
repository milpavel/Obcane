import {EmailMessage} from 'cloudflare:email';
import {handleMail,sender,recipient} from './notification.mjs';
export default {async fetch(request,env){return handleMail(request,env.NOTIFICATION_SECRET,mime=>env.EMAIL.send(new EmailMessage(sender,recipient,mime)));}};
