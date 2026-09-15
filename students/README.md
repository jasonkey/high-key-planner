# students/

One file per student. `example.py` is invented data and is the only file committed —
everything else here is ignored by git, so a real schedule cannot reach GitHub by accident.

To add someone:

```bash
cp example.py sb.py          # edit the courses
cd ../workbooks
python build.py ../students/sb.py
```

Read the schedule off Aspen's **My Info → Schedule → List** view. The `Schedule`
column is the part that matters: `2(2,5) 3(3,6)` means period 2 on rotation days 2
and 5, and period 3 on days 3 and 6.
