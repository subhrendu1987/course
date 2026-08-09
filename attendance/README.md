# Student Attendance system
## Initial Setup
* Fork the project and enable `Git pages`. Identify the URL of the Git pages, which will be called as `<ATTENDANCE_URL>` henceforth.
* Upload `Gdrive/AttendanceSystem.xlsx` in your Google Drive and save it as Google sheet (e.g. `File` -> `Save as Google Sheets`). We'll refer to this Sheet as `SPREADSHEET`
* Open app script (e.g. `Extensions` -> `Apps Script`). Provide a meaningful project name as per your wish.
* Edit `Code.gs` and update it with `Gdrive/Code.gs`. Now link it with the spread sheet created by following the steps below.
	- Edit Line -1 of `Code.gs` (e.g. `SPREADSHEET_URL="https://docs.google.com/spreadsheets/d/1PAFVJikqdhM7u5Cd6Jv89m_uURquVX8w6rEjXRxn7u8/"`) with the URL of your spreadsheet. Ignore the `gid`/`edit` like tags from the URL.
* From `Files Menu` of App Script editor create a separate script file named `functions.gs` and `logger.gs`. Update those scripts with the code from `Gdrive/functions.gs` and `Gdrive/logger.gs`

* Deploy the app as WEBAPP
	- In `App Script` editor interface, find *`Deploy`* button and create a new deployment. Find `Gear` icon to create a `Web app`. Fill `Description` -> `Attendance`, `Execute as` -> `me`, `Who has access` -> `Anyone`. Provide necessary permissions by following the instructions on screen.
	- Once deployed, copy the `Web app URL`. We'll call it as `<WEBAPP_URL>` 
	- ```WEBAPP_URL="https://script.google.com/macros/s/AKfycbz2EW21MpNZ9Y8kV3WytbpQWyl88Gz3Q869yxEuXjjXz_MwK5vUzCFYIDj8vrdWiU2L/exec"```
* Test
	
	- ```curl -sL "$WEBAPP_URL"``` Provides `Config` Parameters in `JSON` format
	- ```curl -sL -H "Content-Type: text/plain;charset=utf-8" -d '{"date":"03_08_2026","group":"2C7","email":"teststudent@example.com","rollNumber":"102103001","serialNumber":"12"}' "$WEBAPP_URL"```
	- ```curl -sL -H "Content-Type: text/plain;charset=utf-8" -d '{"date":"test","group":"2C4","email":"teststudent@example.com","rollNumber":"1025031041","serialNumber":"20"}' "$WEBAPP_URL"```
### Link the Backend with FrontEnd
* In line-2 of `./script.js` update the `<WEBAPP_URL>`. (e.g. `const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2EW21MpNZ9Y8kV3WytbpQWyl88Gz3Q869yxEuXjjXz_MwK5vUzCFYIDj8vrdWiU2L/exec";`)
* Git commit and push the changes. After sometime, open `<ATTENDANCE_URL>` and see the dates, classes and size in the page showing proper values as given in `config` tab of the `SPREADSHEET`. Additionaly, clear local cache also.

# How to use?
Take (panoromic) picture and keep it in `Dataset/RawPicture/` with the date and class name (e.g. `02_08_2026_2C7.jpg`). At present the tool only works for `jpg` extensions. Following the given workflow to generate the student count. Once the annotation is done, add relevant data in `config` tab of `SPREADSHEET`. 

## Generate Image annotations
### Heavy lifting
* Use Gemini/ChatGPT to generate annotaions in `.json` format. Use the following prompt for the same.
````
Create Annotations for the attached picture in yolo annotations in json. In the picture students are seating in a classroom. I want to get the head count with serial number of the students. Only use bounding boxes to identify the student heads. Add occluded students also. The sample output format is ``` [
  "0 0.1230 0.2786 0.0135 0.0012",
  "0 0.1280 0.2354 0.0092 0.0008",
  "0 0.1305 0.2628 0.0162 0.0006",
  "0 0.1530 0.2801 0.0123 0.0010",
  "0 0.1600 0.2354 0.0092 0.0008",
  "0 0.1603 0.2609 0.0121 0.0007",
  "0 0.1950 0.2354 0.0092 0.0008",
  "0 0.1980 0.2661 0.0123 0.0010",
  "0 0.2202 0.2217 0.0077 0.0012",
  "0 0.2290 0.2800 0.0146 0.0024",
  "0 0.2292 0.2498 0.0100 0.0026",
  "0 0.3800 0.2844 0.0110 0.0009",
  "0 0.4378 0.2829 0.0099 0.0009",
  "0 0.4569 0.2840 0.0059 0.0008",
  "0 0.4723 0.2902 0.0067 0.0012",
  "0 0.4876 0.2842 0.0059 0.0013",
  "0 0.5099 0.2902 0.0070 0.0011"
]```
````
* Save the `.json` file in the `Dataset/Annotated/` folder with the same name as the image.
### Generate Annotated Picture
* Move to `Tools` folder `$ cd Tools/`
* Execute `python3 driver.py -f 31_07_2026_2C7`
* Run `python visualizer.py -f <filename>`
* The tool shortcuts are as follows.
	- Save annotations by pressing `s`
	- Quit without saving by pressing `q` or ESC
	- Undo one by one by pressing `z`
	- Reset newly added boxes by pressing `r`
* Use cleanup script to order the boxes based on coordinate by pressing "y", otherwise press "N".

## To use the functionalities separately
### Preview image
* Check if it requires further editing or not by going to `Dataset/Preview/`
### Annotate
* Execute `python3 annotate.py -f <filename>`
* Add missing students by drawing bounding boxes around the faces.
* Remove boxes by right-clicking on the box followed by left click on the same.
* The tool shortcuts are as follows.
	- Save annotations by pressing `s`
	- Quit without saving by pressing `q` or ESC
	- Undo one by one by pressing `z`
	- Reset newly added boxes by pressing `r`
 
### CleanUp annotation
* Cleanup and arrange the boxes in a particular order
```
python3 cleanup.py
```
### Generate final output
```
python visualizer.py
```

### Modify `config.py` to change the paths and other environmental values.
--
## Collect Student Attendances
