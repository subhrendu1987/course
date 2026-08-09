# Student Attendance system
Take (panoromic) picture and keep it in `Dataset/RawPicture/` with the date and class name (e.g. `02_08_2026_2C7.jpg`). Following the given workflow to generate the student count.

## Generate Image annotations

### Heavy lifting
* Use Gemini/ChatGPT to generate annotaions in `.json` format. Use the following prompt for the same.
```
Create Annotations for the attached picture in yolo annotations in json. In the picture students are seating in a classroom. I want to get the head count with serial number of the students. Only use bounding boxes to identify the student heads. Add occluded students also
```
* Save the `.json` file in the `Dataset/Annotated/` folder with the same name as the image.
### Generate Annotated Picture
* Run 
```
python visualizer.py -f <filename>
```
* Check if it requires further editing or not by going to `Dataset/Preview/`
### Annotate
* Open 
```
python3 annotate.py -f <filename> 
```
* Add missing students by drawing bounding boxes around the faces.
* Remove boxes by right-clicking on the box followed by left click on the same.
* Save annotations by pressing `s` 
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
