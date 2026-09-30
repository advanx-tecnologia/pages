import importlib.util,unittest
from unittest.mock import patch
from pathlib import Path
s=importlib.util.spec_from_file_location('gate',Path(__file__).with_name('seo_publish_gate.py'));g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
class ImageGateTests(unittest.TestCase):
 def image(self,markup):
  tags=g.SeoTags();tags.feed(markup);return tags.images[0]
 def test_only_proven_hidden_tracking_pixel_is_exempt(self):
  base='<img src="https://www.facebook.com/tr?id=123&ev=PageView&noscript=1" width="1" height="1" style="display:none">'
  self.assertTrue(g.tracking_pixel(self.image(base)))
  for markup in [base.replace('display:none','display:block'),base.replace('width="1"','width="1400"'),base.replace('www.facebook.com','photos.example.com'),base.replace('/tr?', '/photo?')]:
   self.assertFalse(g.tracking_pixel(self.image(markup)))
 def test_editorial_formats_remain_checked(self):
  self.assertFalse(g.optimized_image('https://example.com/editorial.jpg'))
  self.assertTrue(g.optimized_image('/blog/assets/photo.webp'))
 def test_auto_format_is_not_assumed_from_url(self):
  src='https://images.unsplash.com/photo-test?w=400&auto=format&q=80'
  class Response:
   headers={'Content-Type':'image/webp'}
   def __enter__(self):return self
   def __exit__(self,*a):pass
   def read(self,n):return b'RIFF1234WEBP'+b'0'*20
  with patch.object(g.urllib.request,'urlopen',return_value=Response()):self.assertTrue(g.optimized_image(src))
  g.optimized_image.cache_clear()
  Response.headers={'Content-Type':'text/html'}
  with patch.object(g.urllib.request,'urlopen',return_value=Response()):self.assertFalse(g.optimized_image(src))
  self.assertFalse(g.optimized_image(src.replace('auto=format','auto=compress')))
class EditorialGateTests(unittest.TestCase):
 def run_gate(self,url,transform=lambda text:text,headers=None):
  import contextlib,io,json
  def fetch(u):
   text=g.route_file(u).read_text()
   if u==url:text=transform(text)
   return 200,u.replace('http:','https:'),headers or {},text
  output=io.StringIO()
  with patch.object(g,'fetch_text',side_effect=fetch),patch.object(g,'optimized_image',return_value=True),patch.object(g.sys,'argv',['gate','--url',url,'--dry-run']),contextlib.redirect_stdout(output):
   try:g.main()
   except SystemExit:pass
  return json.loads(output.getvalue())['gates']
 def test_existing_editorial_schemas_and_implicit_index_follow(self):
  for url in ['https://advanx.com.br/blog/','https://advanx.com.br/blog/claude-para-advogados/']:
   with self.subTest(url=url):self.assertEqual(self.run_gate(url),['PASS'])
 def test_explicit_robot_restrictions_still_block_editorial(self):
  url='https://advanx.com.br/blog/claude-para-advogados/'
  for value in ['noindex','nofollow']:
   with self.subTest(value=value):self.assertTrue(any('Robots não indexável' in x for x in self.run_gate(url,headers={'x-robots-tag':value})))
 def test_blog_schema_is_not_exempted(self):
  url='https://advanx.com.br/blog/claude-para-advogados/'
  result=self.run_gate(url,lambda t:t.replace('BlogPosting','Thing'))
  self.assertTrue(any('Schemas obrigatórios ausentes' in x and 'BlogPosting' in x for x in result))
if __name__=='__main__':unittest.main()
