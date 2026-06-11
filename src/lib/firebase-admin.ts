import _admin from 'firebase-admin';

function getAdmin(): typeof _admin {
  if (!_admin.apps.length) {
    _admin.initializeApp({
      credential: _admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }
  return _admin;
}

export const admin = new Proxy({} as typeof _admin, {
  get(_, prop: string) {
    return (getAdmin() as any)[prop];
  },
});
