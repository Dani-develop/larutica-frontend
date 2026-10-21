import nodemailer from 'npm:nodemailer@10.1.7';
import { createMailRelay } from './handler.mjs';
import { tokenHash } from './relay-config.mjs';

Deno.serve(createMailRelay({ tokenHash, createTransport: nodemailer.createTransport }));
