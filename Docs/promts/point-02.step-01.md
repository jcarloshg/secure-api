## step

Step 1 (Sanitization): Use AI to generate a robust sanitizer that strips emails, credit cards, and SSNs (Social security Numbers or 9 numeric digits) from message and replaces them with
<REDACTED: TYPE>.

## main points

- Email: Use a standard RFC 5322 pattern to catch user@domain.com.

- Credit Card: Target 13–16 digit strings (Luhn algorithm check is a plus).

- SSN: Look for the ###-##-#### or ######### (9-digit) pattern.

- Replacement: Ensure the logic uses a global replace to catch multiple instances, turning "Call me at 555-01-9999" into "Call me at <REDACTED: SSN>".

## Prompt 01

0. Read the entire porject

1. You are an expert BackEnd developer, you must sure the scalability of the architecture. Also you must sure the consistency and security of the data.
2. create a middleware into the folder ´src/presentation/middlewares´; Use the entities of library of express
3. The middleware must strip emails, credit cards, and SSNs (Social security Numbers or 9 numeric digits)
   3.1 The middleware must replace them with <REDACTED: [emails | credit cards | SSNs]>

## Prompt 02

1. read the file #file:redactSensitiveData.ts
2. implement the middlewaer for entire app into #file:index.ts
