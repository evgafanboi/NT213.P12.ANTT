### NodeJS based web application.
##### Designed to be `simple`, as `secure` as possible, no `third party` sites involved.
Forever in development.

---
What it is: This is a minimal blog website where:
Posts and comments support markdown:

<img src=images/post-md.png width=600px>

<br>

<img src=images/comment-md.png width=600px>

---

##### As secure as possible, without sacrificing simplicity:

- `2FA` for user authentication, email-based.
- Simple `device` managing, remembering user accross different devices.
- HTTPS only.
- Strict rate limiting.
- CSRF for all `POST` endpoints.
- SQL parameterization for all user inputs, except posts and comments' content where is will be sanitized by `marked` (node module). All inputs are length limited.
- JSON payload limiting.
- Strict policy. Everything is `same-origin` or `self` only. Scripts and styles use `nonce` to bypass CSP.
- Cookies managed by a 1-day expiring session, 1 hour rolling
- `xss-clean` used to mitigate XSS risks.
- SQLite database for brain-damage free clone-and-run. Also `sqlitebrowser` is just goated.
- Users can of course reset their password if they want to or if they just forgot it. Strict password requirement of at least 9 characters long, must be a combination of special characters, upper and lower case and numbers.
- Basic searching, whether through the search bar or via `URL` itself. The page will decode URL characters or straight up raw, so posts can be search like: `home?search=secret recipt to petting a cat`. This function is carefully parameterized in back-end level.

##### Still in development:
Many more functionalities to come, such as:
- Posts and comments voting.
- Nested comments, allowing answers and questions right in the comment section.
- Allowing images on posts or even comments (maybe).
- Extensive settings like themes, languages,... (also maybe)
>Said upcoming functions are only coming if my skyrim addiction allows it.

##### Using this:
- Refer to `docs/GettingStarted.md` to start running this website.