import request from 'supertest';
import app from '../src/index';

describe('POST /secure-inquiry', () => {
    it('should accept valid JSON body', async () => {
        const res = await request(app)
            .post('/secure-inquiry')
            .set('Content-Type', 'application/json')
            .send({ userId: 'user123', message: 'Hello' });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.received).toEqual({ userId: 'user123', message: 'Hello' });
    });

    it('should reject non-JSON content type', async () => {
        const res = await request(app)
            .post('/secure-inquiry')
            .set('Content-Type', 'text/plain')
            .send('userId=user123&message=Hello');
        expect(res.status).toBe(415);
        expect(res.body.error).toMatch(/Content-Type/);
    });

    it('should reject missing userId or message', async () => {
        const res = await request(app)
            .post('/secure-inquiry')
            .set('Content-Type', 'application/json')
            .send({ userId: '', message: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid input/);
    });

    it('should reject non-string userId or message', async () => {
        const res = await request(app)
            .post('/secure-inquiry')
            .set('Content-Type', 'application/json')
            .send({ userId: 123, message: {} });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid input/);
    });
});

