from update_poster_events import parse_event
words=[{'text':t,'conf':'92'} for t in 'Žákovské vystoupení dne 12.11.2026 od 18 hodin V MAKUSU'.split()]
e=parse_event(words,'Žákovské vystoupení','https://www.zsrtyne.cz/KONCERT-12.11.2026.png')
assert e['date']=='2026-11-12' and e['time']=='18:00' and e['location'].startswith('MAKUS')
assert parse_event(words,'Jídelníček','https://www.zsrtyne.cz/KONCERT-12.11.2026.png') is None
assert parse_event(words,'Koncert','https://www.zsrtyne.cz/KONCERT-13.11.2026.png') is None
assert parse_event([{'text':'12.11.2026','conf':'55'}],'Koncert','https://www.zsrtyne.cz/poster.png') is None
assert parse_event(words+[{'text':'13.11.2026','conf':'99'}],'Koncert','https://www.zsrtyne.cz/poster.png') is None
assert parse_event([{'text':'31.2.2027','conf':'99'}],'Koncert','https://www.zsrtyne.cz/poster.png') is None
print('PASS: OCR event/date confidence, filename corroboration, ambiguous dates and unrelated posters rejected')
