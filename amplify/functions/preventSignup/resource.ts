import { defineFunction } from '@aws-amplify/backend';

export const preventSignup = defineFunction({
  entry: './handler.ts',
  environment: {
    ALLOWED_EMAILS: 'jackradema@gmail.com,jaceychavez12@gmail.com' // Replace with your allowed emails
  }
});