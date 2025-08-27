
### Tool call: browser_navigate
- Args
```json
{
  "url": "http://ruhealth.org/appointments/apply-4-wic-form"
}
```
- Code
```js
await page.goto('http://ruhealth.org/appointments/apply-4-wic-form');
```
- Snapshot: 001.snapshot.yml


### Tool call: browser_fill_form
- Args
```json
{
  "fields": [
    {
      "name": "Name",
      "type": "textbox",
      "ref": "e115",
      "value": "Jane Doe"
    },
    {
      "name": "Children/Toddler 0-5",
      "type": "checkbox",
      "ref": "e184",
      "value": "true"
    }
  ]
}
```
- Code
```js
await page.getByRole('textbox', { name: 'Name' }).fill('Jane Doe');
await page.getByRole('checkbox', { name: 'Children/Toddler 0-' }).setChecked('true');
```


### Tool call: browser_fill_form
- Args
```json
{
  "fields": [
    {
      "name": "In-Person",
      "type": "checkbox",
      "ref": "e192",
      "value": "true"
    }
  ]
}
```
- Code
```js
await page.getByRole('checkbox', { name: 'In-Person' }).setChecked('true');
```


### Tool call: browser_select_option
- Args
```json
{
  "element": "Please choose the WIC Clinic Closest to you",
  "ref": "e202",
  "values": [
    "Riverside Neighborhood WIC"
  ]
}
```
- Code
```js
await page.getByLabel('Please choose the WIC Clinic').selectOption(['Riverside Neighborhood WIC']);
```
- Snapshot: 004.snapshot.yml

